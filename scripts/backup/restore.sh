#!/usr/bin/env bash
# Bring back a backup made by backup.sh.
#   bash scripts/backup/restore.sh                         list the backups on this server
#   bash scripts/backup/restore.sh <db_….dump> [photos_….tar.gz]
# Replaces EVERYTHING in the live database (and the photos folder) – stop the app first.
set -Eeuo pipefail
# shellcheck source=env.sh
. "$(dirname "$0")/env.sh"
uploads=${UPLOAD_DIR:-./uploads}

if [[ $# -eq 0 ]]; then
  ls -lh "$dir"
  exit 0
fi

db_file=$1
photos_file=${2:-}
read -r -p "Replace the live database ${db_url##*/} with $(basename "$db_file")? Type yes: " ok
[[ $ok == yes ]] || { echo "Stopped – nothing changed."; exit 1; }

pg_restore --clean --if-exists --no-owner --exit-on-error --single-transaction --dbname="$db_url" "$db_file"
echo "Database restored from $db_file"

if [[ -n $photos_file ]]; then
  [[ -d $uploads ]] && mv "$uploads" "$uploads.before-restore-$(date +%s)"
  tar -xzf "$photos_file" -C "$(dirname "$uploads")"
  echo "Photos restored to $uploads (the old folder was kept next to it)"
fi
echo "Start the app again."
