#!/usr/bin/env bash
# scripts/backup.sh — snapshot the production stack into a single tarball.
#
# What you get:
#   backups/your-blog-YYYY-MM-DD_HHMMSS.tar.gz
#     ├── db.sql.gz       (mysqldump --single-transaction, gzipped)
#     ├── uploads.tar.gz  (entire blog-uploads named volume)
#     └── manifest.txt
#
# Usage:
#   bash scripts/backup.sh                            # uses .env.production
#   ENV_FILE=.env.staging bash scripts/backup.sh      # override env file
#   BACKUP_DIR=/mnt/big bash scripts/backup.sh        # override output dir
#
# ───────────────────────────────────────────────────────────────────────
# To restore (⚠ overwrites current data):
#
#   # 1) unpack
#   mkdir -p restore && tar xzf backups/your-blog-<timestamp>.tar.gz -C restore
#
#   # 2) restore MySQL — reads .env.production for root password + db name
#   set -a; . .env.production; set +a
#   gunzip -c restore/db.sql.gz | docker exec -i your-blog-mysql-prod \
#     mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"
#
#   # 3) restore uploads volume (wipe old then untar)
#   docker run --rm -v your-blog-uploads:/data -v "$PWD/restore":/in alpine:3 \
#     sh -c 'rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null; tar xzf /in/uploads.tar.gz -C /data'
#
#   # 4) bounce server so the connection pool sees fresh data
#   docker compose -f docker-compose.prod.yml --env-file .env.production restart server
# ───────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.production}"
if [ ! -f "$ENV_FILE" ]; then
  echo "✗ env file not found: $ENV_FILE" >&2
  echo "  pass ENV_FILE=path or create .env.production" >&2
  exit 1
fi

# Load just MYSQL_* + DATABASE_URL from the env file.
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

# Container + volume names — keep in sync with docker-compose.prod.yml.
MYSQL_CONTAINER="${MYSQL_CONTAINER:-your-blog-mysql-prod}"
UPLOADS_VOLUME="${UPLOADS_VOLUME:-your-blog-uploads}"
: "${MYSQL_DATABASE:?MYSQL_DATABASE not set in $ENV_FILE}"
: "${MYSQL_ROOT_PASSWORD:?MYSQL_ROOT_PASSWORD not set in $ENV_FILE}"

# Sanity checks.
if ! docker info > /dev/null 2>&1; then
  echo "✗ docker daemon not reachable" >&2
  exit 1
fi
if ! docker ps --format '{{.Names}}' | grep -qx "$MYSQL_CONTAINER"; then
  echo "✗ mysql container not running: $MYSQL_CONTAINER" >&2
  echo "  start with: docker compose -f docker-compose.prod.yml --env-file $ENV_FILE up -d" >&2
  exit 1
fi
if ! docker volume inspect "$UPLOADS_VOLUME" > /dev/null 2>&1; then
  echo "✗ uploads volume not found: $UPLOADS_VOLUME" >&2
  exit 1
fi

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
OUT_DIR="${BACKUP_DIR:-backups}"
mkdir -p "$OUT_DIR"

STAGE_DIR=$(mktemp -d)
trap 'rm -rf "$STAGE_DIR"' EXIT

# 1) MySQL dump — streamed through gzip, no intermediate plaintext file on disk.
#    --single-transaction gives a consistent InnoDB snapshot without locking tables.
echo "→ dumping mysql ($MYSQL_DATABASE)..."
docker exec "$MYSQL_CONTAINER" sh -c \
  "exec mysqldump --single-transaction --routines --triggers --no-tablespaces \
     -uroot -p\"\$MYSQL_ROOT_PASSWORD\" \"\$MYSQL_DATABASE\"" \
  2>/dev/null | gzip > "$STAGE_DIR/db.sql.gz"

# 2) Uploads volume — a throwaway alpine container that mounts the volume read-only
#    and the staging dir as writable, then tars the contents in place.
echo "→ archiving uploads volume ($UPLOADS_VOLUME)..."
docker run --rm \
  -v "$UPLOADS_VOLUME:/data:ro" \
  -v "$STAGE_DIR:/out" \
  alpine:3 \
  tar czf /out/uploads.tar.gz -C /data . > /dev/null

# 3) Manifest for whoever opens this archive in 6 months and forgets what it was.
cat > "$STAGE_DIR/manifest.txt" <<EOF
your-blog backup
created:         $(date -u +"%Y-%m-%dT%H:%M:%SZ")
hostname:        $(hostname)
mysql container: $MYSQL_CONTAINER
mysql database:  $MYSQL_DATABASE
uploads volume:  $UPLOADS_VOLUME
env file:        $ENV_FILE
EOF

# 4) Pack everything together.
OUT_FILE="$OUT_DIR/your-blog-$TIMESTAMP.tar.gz"
tar czf "$OUT_FILE" -C "$STAGE_DIR" db.sql.gz uploads.tar.gz manifest.txt

SIZE=$(du -h "$OUT_FILE" | cut -f1)
echo ""
echo "✓ $OUT_FILE ($SIZE)"
