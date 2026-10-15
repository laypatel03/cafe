#!/usr/bin/env bash
# Nightly backup (P5-03): database + dish photos, saved on this server, checked by a test restore,
# kept BACKUP_KEEP_DAYS days, then an email says whether it worked.
#   bash scripts/backup/backup.sh            run now (the systemd timer runs it at 03:00 IST)
#   bash scripts/backup/backup.sh --no-mail  run without emailing
# Settings come from .env – see the "Backups" block in .env.example.
set -Eeuo pipefail
# shellcheck source=env.sh
. "$(dirname "$0")/env.sh"

db_name=${db_url##*/}
keep=${BACKUP_KEEP_DAYS:-30}
uploads=${UPLOAD_DIR:-./uploads}
mail=true
[[ ${1:-} == --no-mail ]] && mail=false

stamp=$(TZ=Asia/Kolkata date +%Y-%m-%d_%H%M)
day=$(TZ=Asia/Kolkata date "+%-d %b %Y")
log=$(mktemp)
started=$(date +%s)
check_db="${db_name}_restore_check"

say() { echo "$*" | tee -a "$log"; }

send_mail() { # subject
  [[ $mail == true ]] || return 0
  if [[ -z ${SMTP_URL:-} || -z ${BACKUP_EMAIL_TO:-} ]]; then
    echo "SMTP_URL / BACKUP_EMAIL_TO not set – no email sent." >&2
    return 0
  fi
  local msg rcpt=()
  msg=$(mktemp)
  for to in ${BACKUP_EMAIL_TO//,/ }; do rcpt+=(--mail-rcpt "$to"); done
  {
    echo "From: Healthy Hunger backups <${SMTP_FROM:-$SMTP_USER}>"
    echo "To: $BACKUP_EMAIL_TO"
    echo "Subject: $1"
    echo "Date: $(LC_ALL=C date "+%a, %d %b %Y %H:%M:%S %z")"
    echo "Content-Type: text/plain; charset=utf-8"
    echo
    cat "$log"
  } >"$msg"
  curl --silent --show-error --ssl-reqd --url "$SMTP_URL" \
    --user "$SMTP_USER:$SMTP_PASS" --mail-from "${SMTP_FROM:-$SMTP_USER}" "${rcpt[@]}" \
    --upload-file "$msg" || echo "Email could not be sent." >&2
  rm -f "$msg"
}

cleanup_check_db() { psql "$db_url" -qAtc "DROP DATABASE IF EXISTS \"$check_db\"" >/dev/null 2>&1 || true; }

on_error() {
  local line=$1
  cleanup_check_db
  say ""
  say "❌ Backup FAILED (script line $line). Today's copy may be missing – check the server."
  say "Re-run by hand: bash scripts/backup/backup.sh"
  send_mail "❌ Healthy Hunger backup FAILED – $day"
  rm -f "$log"
  exit 1
}
trap 'on_error $LINENO' ERR

mkdir -p "$dir"
chmod 700 "$dir"
db_file="$dir/db_$stamp.dump"
photos_file="$dir/photos_$stamp.tar.gz"

say "Healthy Hunger backup – $day, $(TZ=Asia/Kolkata date +%H:%M) IST"
say ""

# custom format: compressed, and pg_restore can bring back the whole database or one table
pg_dump "$db_url" --format=custom --no-owner --file="$db_file.part"
mv "$db_file.part" "$db_file"
chmod 600 "$db_file"
say "Database: $(du -h "$db_file" | cut -f1)  ($db_file)"

if [[ -d $uploads ]]; then
  tar -czf "$photos_file.part" -C "$(dirname "$uploads")" "$(basename "$uploads")"
  mv "$photos_file.part" "$photos_file"
  chmod 600 "$photos_file"
  say "Photos:   $(du -h "$photos_file" | cut -f1)  ($photos_file)"
else
  say "Photos:   none – $uploads not found"
fi

# prove the copy can be restored: load it into a throwaway database and count what came back
if [[ ${BACKUP_RESTORE_CHECK:-true} == true ]]; then
  cleanup_check_db
  psql "$db_url" -qAtc "CREATE DATABASE \"$check_db\"" >/dev/null
  pg_restore --no-owner --exit-on-error --dbname="${db_url%/*}/$check_db" "$db_file"
  counts=$(psql "${db_url%/*}/$check_db" -qAtF ' ' -c \
    'SELECT (SELECT count(*) FROM "Order"), (SELECT count(*) FROM "Bill"), (SELECT count(*) FROM "Customer"), (SELECT count(*) FROM "MenuItem")')
  read -r orders bills customers dishes <<<"$counts"
  cleanup_check_db
  say "Restore check: OK – $orders orders, $bills bills, $customers customers, $dishes dishes"
fi

# keep the last $keep days; 0 = keep every copy
say ""
copies() { find "$dir" -maxdepth 1 -name 'db_*.dump' | wc -l | tr -d ' '; }
if [[ $keep -gt 0 ]]; then
  removed=$(find "$dir" -maxdepth 1 -type f \( -name 'db_*.dump' -o -name 'photos_*.tar.gz' \) -mtime +"$((keep - 1))" -print -delete | wc -l | tr -d ' ')
  say "Kept: $(copies) daily copies ($keep-day limit, $removed old files removed)"
else
  say "Kept: $(copies) daily copies (nothing is deleted – BACKUP_KEEP_DAYS is 0)"
fi
say "Space used: $(du -sh "$dir" | cut -f1), free on disk: $(df -h "$dir" | awk 'NR==2 {print $4}')"
say "Took $(($(date +%s) - started)) s."

send_mail "✅ Healthy Hunger backup OK – $day"
rm -f "$log"
