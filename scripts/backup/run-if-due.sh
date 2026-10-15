#!/usr/bin/env bash
# Mac only (testing before the server). launchd runs this every 30 minutes; it starts backup.sh
# once a day, the first time it runs after 03:00 India time – launchd only knows the Mac's own
# clock, and 03:00 IST moves in New York time when the clocks change.
set -euo pipefail
# shellcheck source=env.sh
. "$(dirname "$0")/env.sh"
state="$dir/.last-run"
today=$(TZ=Asia/Kolkata date +%Y-%m-%d)
now=$(TZ=Asia/Kolkata date +%H%M)

[[ 10#$now -ge 300 ]] || exit 0
[[ $(cat "$state" 2>/dev/null) != "$today" ]] || exit 0
mkdir -p "$dir"
# marked before running, so a failed night sends one email, not one every half hour
echo "$today" >"$state"
echo "--- $(date) – starting backup for $today (IST)"
bash scripts/backup/backup.sh
