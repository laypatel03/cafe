#!/usr/bin/env bash
# WhatsApp pay-later notes and due reminders: asks the running app to send whatever is due. The app
# decides – pay-later notes 30 min after closing, reminders on the day and hour in Settings → WhatsApp –
# and each goes once, so running this every 5 minutes (the systemd timer) or by hand is always safe.
#   bash scripts/whatsapp/run-reminders.sh
# Needs CRON_SECRET in .env; APP_URL (default http://127.0.0.1:3000) is where the app listens.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
set -a
# shellcheck disable=SC1091
. ./.env
set +a
: "${CRON_SECRET:?Set CRON_SECRET in .env}"
url=${APP_URL:-http://127.0.0.1:3000}
curl -fsS --max-time 600 -X POST -H "Authorization: Bearer $CRON_SECRET" "$url/api/cron/due-reminders"
echo
