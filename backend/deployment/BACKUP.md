# Raccoon Coffee — backup and restore procedure

Scope: one VPS. Two things must be backed up together:

1. the MySQL/MariaDB database (all application rows),
2. the upload directory `/var/lib/raccoon/uploads` (image bytes referenced by
   those rows).

A backup is only useful when it is stored **outside the VPS** and a restore has
actually been tested. Nothing in this document is applied automatically; adapt
`<...>` placeholders on the server and never commit real credentials.

---

## 1. Prerequisites

- `mysqldump`/`mysql` client matching the server version.
- `rsync` or `rclone` for off-VPS transfer.
- A dedicated backup destination on another machine (object storage, another
  server, or an external disk that is not the VPS system disk).

Create a read-only database account for backups (run as DB admin):

```sql
CREATE USER 'raccoon_backup'@'127.0.0.1' IDENTIFIED BY '<password>';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES
  ON raccoon.* TO 'raccoon_backup'@'127.0.0.1';
```

If `mysqldump --routines` is denied on MySQL 8, also grant
`GRANT SHOW_ROUTINE ON *.* TO 'raccoon_backup'@'127.0.0.1';` (MariaDB does not
need it). Alternatively drop `--routines` when the application has no stored
routines.

Store the password in a root-owned file outside the repository, e.g.
`/etc/raccoon/backup.cnf` with `chmod 600`:

```ini
[client]
host=127.0.0.1
user=raccoon_backup
password=<password>
```

---

## 2. Consistency: stop writes, or accept a small window

`mysqldump --single-transaction` gives a consistent snapshot of InnoDB tables
without locking them, but it says nothing about files on disk. Two options:

**A. Consistent backup (recommended for this site size).** Stop the writers for
the duration of the copy:

```bash
sudo systemctl stop raccoon-web raccoon-api
# run the dump and the uploads copy (section 3)
sudo systemctl start raccoon-api raccoon-web
```

**B. Online backup.** Run the uploads copy and the dump while the site is live.
A file uploaded or deleted between the two steps can be missing from the pair.
Accept this only if a small inconsistency window is tolerable, and verify after
every restore test.

`--single-transaction` only covers transactional tables (InnoDB). Any MyISAM
table is not protected; keep all application tables InnoDB.

---

## 3. Create a backup

Run sections 3–5 as root (the cron entry in section 8 does). The backup
credentials file is root-only, and the destination directory is root-owned.

Paths used below (adapt if the deployment differs):

- dump: `/var/backups/raccoon/<timestamp>/raccoon.sql.gz`
- uploads: `/var/backups/raccoon/<timestamp>/uploads/`

```bash
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DEST=/var/backups/raccoon/$STAMP
sudo install -d -m 750 "$DEST"

# 1. Database snapshot (no password on the command line).
mysqldump --defaults-extra-file=/etc/raccoon/backup.cnf \
  --single-transaction --quick --routines --triggers --events \
  --default-character-set=utf8mb4 \
  raccoon | gzip -9 > "$DEST/raccoon.sql.gz"

# 2. Upload files (trailing slash on the source = copy contents).
sudo rsync -a /var/lib/raccoon/uploads/ "$DEST/uploads/"

# 3. Checksums and a small manifest for later verification.
( cd "$DEST" && sha256sum raccoon.sql.gz > SHA256SUMS )
du -sh "$DEST"
```

Notes:

- MySQL 8 may ask for `PROCESS` to dump tablespaces. Add `--no-tablespaces` if
  the backup account has no `PROCESS` privilege.
- Do not use `--all-databases` here; only the application database is needed.
- The dump contains password hashes and user data: treat it as sensitive.

---

## 4. Copy off the VPS

Pick one mechanism and keep it outside the VPS:

```bash
# rsync over SSH to another host
rsync -a --delete "$DEST/" <backup-user>@<backup-host>:<backup-path>/raccoon/$STAMP/

# or rclone to object storage
rclone copy "$DEST" <remote>:<bucket>/raccoon/$STAMP/
```

- `--delete` is safe only when the destination is the dedicated per-run
  directory shown above. Never point it at a shared directory.
- Retention: keep at least 7 daily and 4 weekly copies, then delete old ones
  locally and remotely. Storage growth is the operator's responsibility.
- The VPS copy under `/var/backups/raccoon` is a staging area, not a backup.

---

## 5. Verify the backup (do this every run)

```bash
STAMP=<timestamp>
DEST=/var/backups/raccoon/$STAMP

gzip -t "$DEST/raccoon.sql.gz"                     # archive is not corrupt
( cd "$DEST" && sha256sum -c SHA256SUMS )          # matches what was written
zcat "$DEST/raccoon.sql.gz" | head -n 20           # has a dump header
zcat "$DEST/raccoon.sql.gz" | grep -c 'CREATE TABLE'   # > 0
find "$DEST/uploads" -type f | wc -l               # plausible file count
```

Compare the last number with the live directory:

```bash
sudo find /var/lib/raccoon/uploads -type f | wc -l
```

Record the timestamp, sizes, and counts in the operator log. A backup that was
not verified is not a backup.

---

## 6. Test the restore (never against the production database)

Restore into a scratch database and compare row counts:

```bash
# As DB admin, create a throwaway database.
mysql -e "CREATE DATABASE raccoon_restore_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Load the dump into it. A single-database dump (no --databases flag) contains
# no USE statement, so it lands in the database named on the command line.
zcat "$DEST/raccoon.sql.gz" | mysql raccoon_restore_test

# Compare table row counts, production vs restore.
for t in $(mysql -N -B -e "SELECT table_name FROM information_schema.tables WHERE table_schema='raccoon' AND table_type='BASE TABLE'"); do
  prod=$(mysql -N -B -e "SELECT COUNT(*) FROM raccoon.\`$t\`")
  test=$(mysql -N -B -e "SELECT COUNT(*) FROM raccoon_restore_test.\`$t\`")
  [ "$prod" = "$test" ] || echo "MISMATCH $t production=$prod restore=$test"
done

# Uploads: verify a sample of referenced files exists in the backup copy.
sudo find "$DEST/uploads" -type f -size 0 | head   # should print nothing
```

Clean up when done:

```bash
mysql -e "DROP DATABASE raccoon_restore_test;"
```

If any table count differs, the dump is not usable: fix the backup before
relying on it. Also spot-check that the newest uploaded image is present in the
backup copy.

---

## 7. Full restore procedure (disaster recovery)

Run as root on a rebuilt VPS after the database, deploy user, service user,
directories, `/etc/raccoon/raccoon-api.env`, and the application checkout
(built and pruned as described in `README.md`) exist:

The production `node_modules` has been pruned with `npm prune --omit=dev`, so
the `prisma` CLI (a dev dependency) is **not available**. Do not assume
`npx prisma migrate status` works; the schema checks below use the `mysql`
client and the running API instead.

```bash
sudo systemctl stop raccoon-web raccoon-api

# 1. Database: recreate and load. Prefer restoring into a fresh database.
mysql -e "CREATE DATABASE IF NOT EXISTS raccoon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
zcat /var/backups/raccoon/<timestamp>/raccoon.sql.gz | mysql raccoon

# 2. Uploads: restore bytes, then fix ownership.
sudo install -d -o <service-user> -g <service-group> -m 750 /var/lib/raccoon/uploads
sudo rsync -a --delete /var/backups/raccoon/<timestamp>/uploads/ /var/lib/raccoon/uploads/
sudo chown -R <service-user>:<service-group> /var/lib/raccoon/uploads

# 3. Schema check without the Prisma CLI:
#    the dump must contain the migration ledger and all application tables.
mysql -N -B -e "SELECT COUNT(*) FROM raccoon._prisma_migrations WHERE finished_at IS NOT NULL;"
mysql -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='raccoon' AND table_type='BASE TABLE';"
# Both counts must be > 0 and match the values recorded for this backup.

# 4. Start and verify through the API. The service reads DATABASE_URL from
#    /etc/raccoon/raccoon-api.env (systemd loads it; the value is never printed),
#    so a healthy response proves the restored schema is reachable with the
#    real connection string.
sudo systemctl start raccoon-api raccoon-web
curl -fsS https://<domain>/api/health
# expected: {"status":"ok","database":"up"}
```

`/api/health` is the `DATABASE_URL` verification: it runs `SELECT 1` through
Prisma using the service's configured connection string. It needs only
`@prisma/client`, which stays installed after `npm prune --omit=dev`; the
`prisma` CLI does not.

Optional — confirm that `DATABASE_URL` is present in the env file without
printing its value:

```bash
sudo bash -c 'set -a; . /etc/raccoon/raccoon-api.env; set +a; [ -n "$DATABASE_URL" ] && echo "DATABASE_URL loaded" || echo "DATABASE_URL missing"'
```

### If the restored code is newer than the dump

A backup restores the schema as it existed at dump time. If the current
checkout contains migrations created after that backup, apply them **before**
starting the API (the service must never run against an old schema).

The Prisma CLI is only available temporarily via `npx`; this downloads the CLI
into the npm cache and does **not** modify `package.json` or `node_modules`, so
the production dependency set stays pruned. Keep the version in sync with
`backend/package.json` (`prisma` 6.19.0 at the time of writing):

```bash
sudo bash -c '
  set -a; . /etc/raccoon/raccoon-api.env; set +a
  export HOME=/home/<deploy-user>
  cd /srv/raccoon/backend
  exec runuser -u <deploy-user> --preserve-environment -- npx --yes prisma@6.19.0 migrate deploy
'
```

Then start the services and run the `/api/health` check from step 4. Do not run
`npm install`/`npm ci` on the production tree just to get the CLI back; that
would change the dependency tree that was pruned for deployment.

Finally log in to the admin area over HTTPS, open a product and a site image that
existed before the restore, and confirm the images render. Upload one new image
to confirm write access to the upload directory.

---

## 8. Scheduling

Example cron entry (root), daily at 03:15 UTC. The script should contain the
commands from sections 3–5 and exit non-zero on any failure so cron mails the
operator:

```cron
15 3 * * * /usr/local/sbin/raccoon-backup.sh >> /var/log/raccoon-backup.log 2>&1
```

Monitoring: alert if the newest off-VPS backup is older than 36 hours, or if
`df -h /var/lib/raccoon` is above 80% used.

---

## 9. What remains unverified

This document is a procedure, not a tested deployment. Until it is run on the
real VPS, the following stay **unverified**:

- actual dump/restore against the production schema and data volume,
- upload copy completeness under live traffic,
- off-VPS transfer credentials and retention jobs,
- cron execution, alerting, and disk monitoring.
