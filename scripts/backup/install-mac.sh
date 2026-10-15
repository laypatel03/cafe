#!/usr/bin/env bash
# Mac only: run the nightly backup on this Mac at 03:00 India time (see run-if-due.sh).
#   bash scripts/backup/install-mac.sh             install / update
#   bash scripts/backup/install-mac.sh --remove    stop it (backups already made are kept)
# Log: ~/Library/Logs/healthy-hunger-backup.log
set -euo pipefail
label=in.healthyhunger.backup
plist="$HOME/Library/LaunchAgents/$label.plist"
log="$HOME/Library/Logs/healthy-hunger-backup.log"

launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
if [[ ${1:-} == --remove ]]; then
  rm -f "$plist"
  echo "Nightly backup stopped. Backups already made are untouched."
  exit 0
fi

# shellcheck source=env.sh
. "$(dirname "$0")/env.sh"
mkdir -p "$dir"
# today's 03:00 IST has already passed if it's later than that now – start from tomorrow's
if [[ 10#$(TZ=Asia/Kolkata date +%H%M) -ge 300 && ! -f "$dir/.last-run" ]]; then
  TZ=Asia/Kolkata date +%Y-%m-%d >"$dir/.last-run"
fi

pg_bin=$(dirname "$(command -v pg_dump)")
mkdir -p "$(dirname "$plist")" "$(dirname "$log")"
cat >"$plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$PWD/scripts/backup/run-if-due.sh</string></array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>$pg_bin:/usr/bin:/bin:/usr/sbin:/sbin</string></dict>
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Minute</key><integer>0</integer></dict>
    <dict><key>Minute</key><integer>30</integer></dict>
  </array>
  <key>StandardOutPath</key><string>$log</string>
  <key>StandardErrorPath</key><string>$log</string>
</dict>
</plist>
PLIST
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "Installed. Checks every 30 min; backs up once a day after 03:00 IST into $dir"
echo "Log: $log"
