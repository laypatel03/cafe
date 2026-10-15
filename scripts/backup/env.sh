# Shared by the backup scripts (sourced, not run): work from the repo root with the settings in .env.
cd "$(dirname "${BASH_SOURCE[0]}")/../.."
set -a
# shellcheck disable=SC1091
. ./.env
set +a
dir=${BACKUP_DIR:-/var/backups/healthy-hunger}
# pg_dump doesn't understand Prisma's ?schema=public
db_url=${DATABASE_URL%%\?*}
