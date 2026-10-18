# Raccoon Coffee — deployment notes (one VPS, Linux + systemd + Nginx)

Plain systemd + Nginx deployment. No Docker (deliberately out of scope).
Templates in this directory:

| File | Purpose |
| --- | --- |
| `raccoon-api.service.example` | systemd unit for the NestJS API (`dist/main.js`, port 3001) |
| `raccoon-api.env.example` | environment file template for the API |
| `raccoon-web.service.example` | systemd unit for the Next.js frontend (`next start`, port 3000) |
| `raccoon-nginx-bootstrap.conf.example` | temporary HTTP-only Nginx site used to obtain the first certificate |
| `raccoon-nginx.conf.example` | final Nginx site: 80→443, `/api/`→3001, `/`→3000 |
| `BACKUP.md` | database + upload backup, verification, and restore test procedure |

Everything marked `<...>` is a placeholder — fill in real values on the server;
never commit filled-in copies, real domains, certificates, or secrets.

Runtime layout used by the templates:

| Component | Path / port | User |
| --- | --- | --- |
| Checkout | `/srv/raccoon` (`backend/`, `frontend/`) | `<deploy-user>` (read/write); `<service-user>` (read/execute) |
| API | `127.0.0.1:3001` | `<service-user>` |
| Frontend | `127.0.0.1:3000` | `<service-user>` |
| Uploads | `/var/lib/raccoon/uploads` | `<service-user>` (read/write) |
| API env | `/etc/raccoon/raccoon-api.env` | `root:root`, `chmod 600` |
| Frontend env (optional) | `/etc/raccoon/raccoon-web.env` | `root:<service-group>`, `chmod 640` |
| Backup staging | `/var/backups/raccoon` | `root` |

## 1. Files and permissions

| Item | Suggested | Why |
| --- | --- | --- |
| Env file | `/etc/raccoon/raccoon-api.env`, owner `root:root`, `chmod 600` | Holds `JWT_SECRET` and `DATABASE_URL`; must live outside the repo, systemd loads it before dropping privileges. The deploy user cannot read it directly (see §2 for migrations). |
| Deploy user | dedicated user that owns the checkout and runs `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run build`, `npm run admin:bootstrap`, `npm prune --omit=dev` (e.g. `raccoon-deploy`) | Needs write access to the build directory; never runs the services. The demo seed is not part of a production deploy (§3 step 6). |
| Service user | dedicated non-login user (e.g. `raccoon`, created with `useradd --system --no-create-home --shell /usr/sbin/nologin raccoon`) | Runs both systemd units; needs only read/execute on the checkout plus read/write on the upload directory. |
| Deploy dir | e.g. `/srv/raccoon` (owned by `<deploy-user>:<deploy-group>`, mode 750, service user in `<deploy-group>`) | Deploy user writes; the service only reads/executes. |
| Upload dir | `/var/lib/raccoon/uploads`, owned by the service user (`chmod 750`) | Outside the code tree; the service user needs read/write; mounted with a disk quota if possible. |
| Frontend cache | `/srv/raccoon/frontend/.next/cache`, group-writable by the service user (the deploy user still owns the build output) | The Next.js image optimizer writes here; the unit keeps the rest of the checkout read-only. |
| Ports | API `3001`, frontend `3000`; both bind on loopback — firewall them (`ufw deny 3000`, `ufw deny 3001`) so only Nginx reaches them | Neither service is meant to be exposed directly. |

Both systemd units run as the same non-login `<service-user>`; do not run
either unit as root. The deploy user is a separate account and must not be the
service user: it owns the build directory, while the service user only needs
runtime read access.

One-time user, directory, and permission setup (run as root; replace the
placeholders, e.g. `<deploy-user>` = `raccoon-deploy`, `<service-user>` =
`raccoon`; skip the `useradd` lines when the accounts already exist):

```bash
# Deploy user: owns /srv/raccoon, runs install/build/migration/prune.
sudo useradd --system --user-group --create-home --shell /bin/bash <deploy-user>

# Service user: runs both units, no interactive shell.
sudo useradd --system --user-group --no-create-home --shell /usr/sbin/nologin <service-user>
# Group read/execute on the checkout (the deploy user's primary group by default).
sudo usermod -aG <deploy-group> <service-user>

# Checkout: created and owned by the deploy user.
sudo install -d -o <deploy-user> -g <deploy-group> -m 750 /srv/raccoon
sudo -u <deploy-user> -H git clone <repository-url> /srv/raccoon
sudo chmod -R g+rX /srv/raccoon

# Runtime directories.
sudo install -d -o <service-user> -g <service-group> -m 750 /var/lib/raccoon/uploads
sudo install -d -o root -g <service-group> -m 750 /etc/raccoon
sudo install -d -o root -g root -m 700 /var/backups/raccoon
```

`/etc/raccoon` stays root-owned; only systemd (as root) reads the env file. The
checkout is owned by the deploy user and read-only to the service user at
runtime (enforced by both units). Re-run `sudo chmod -R g+rX /srv/raccoon`
after deploying files that are not group-readable.

Loopback binding is configured in two places, not only in the firewall:

- API: `main.ts` calls `app.listen(port, host)` with `HOST` defaulting to
  `127.0.0.1` (`HOST` is documented in `raccoon-api.env.example`).
- Next.js: the unit starts `next start -H 127.0.0.1 -p 3000`.

Verify on the server with `sudo ss -ltnp | grep -E ':(3000|3001)\b'`; the local
address must be `127.0.0.1:...`, not `0.0.0.0:...` or `[::]:...`. Firewall rules
(`ufw deny 3000`, `ufw deny 3001`) remain as defense in depth.

## 2. Database and migrations

- MySQL/MariaDB only (`mysql://` or `mariadb://` in `DATABASE_URL`).

### 2.1 Provision the database and application user

Run once on a new server, as a database administrator (root over the local
socket). Create the schema, then a dedicated application user; never let the app
use `root`. Generate the password with `openssl rand -hex 32` (hex needs no
percent-encoding inside `DATABASE_URL`), enter it at the prompt, and never paste
it into a command line, a committed file, or this README.

```bash
read -r -s -p "New password for 'raccoon_app'@'127.0.0.1': " RACCOON_DB_PASSWORD; echo
sudo mysql --batch <<SQL
CREATE DATABASE IF NOT EXISTS raccoon CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'raccoon_app'@'127.0.0.1' IDENTIFIED BY '${RACCOON_DB_PASSWORD}';
ALTER USER 'raccoon_app'@'127.0.0.1' IDENTIFIED BY '${RACCOON_DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, REFERENCES
  ON raccoon.* TO 'raccoon_app'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
unset RACCOON_DB_PASSWORD
```

- Host `127.0.0.1` only: Prisma and the API connect over loopback. Do not grant
  `'raccoon_app'@'%'`.
- The DML grants serve the running application. The DDL grants (`CREATE`,
  `ALTER`, `DROP`, `INDEX`, `REFERENCES`) are what `prisma migrate deploy` needs
  on this single-user setup. For stricter separation, run migrations as a
  separate migration user and remove the DDL grants from the application user
  afterwards.
- If the chosen password contains characters reserved in a URL, percent-encode
  them in `DATABASE_URL`; `openssl rand -hex 32` avoids the problem.
- Write the connection string into `/etc/raccoon/raccoon-api.env` as
  `DATABASE_URL=mysql://raccoon_app:<password>@127.0.0.1:3306/raccoon`
  (ownership and mode in §1). Never commit that file.
- Verify the grants without printing the password:
  `sudo mysql -e "SHOW GRANTS FOR 'raccoon_app'@'127.0.0.1';"`
- Run migrations explicitly during deploy, **as the deploy user**, from
  `backend/`. Never `db push`, never `migrate reset` on a server.
- Run migrations BEFORE `systemctl restart raccoon-api` so the new code never runs against an old schema.
- `DATABASE_URL` comes from `/etc/raccoon/raccoon-api.env`. That file is
  `root:root` `chmod 600`, so the deploy user cannot read it directly. Use a
  root shell that sources it and then drops to the deploy user with the
  environment inherited. The value is never printed and never passed on a
  command line:

  ```bash
  sudo bash -c '
    set -a; . /etc/raccoon/raccoon-api.env; set +a
    export HOME=/home/<deploy-user>
    cd /srv/raccoon/backend
    exec runuser -u <deploy-user> --preserve-environment -- npx prisma migrate deploy
  '
  ```

  Do not `cat`, `echo`, or otherwise display the env file, and do not paste the
  connection string into a shell history. To confirm only that the variable is
  present: `sudo bash -c 'set -a; . /etc/raccoon/raccoon-api.env; set +a; [ -n "$DATABASE_URL" ] && echo "DATABASE_URL loaded" || echo "DATABASE_URL missing"'`.
- After `prisma migrate deploy`, bootstrap the first admin with
  `npm run admin:bootstrap` (§3 step 6). Do not use the seed for this.
- Backups are a separate procedure: see `BACKUP.md`.

## 3. Deploy checklist

Backend (steps 1–6 run as the deploy user, not the service user):

1. Pull the new code into `/srv/raccoon` as the deploy user, then from
   `backend/` install **all** dependencies including dev (the build and the
   Prisma CLI need them):
   `sudo -u <deploy-user> -H bash -lc 'cd /srv/raccoon/backend && npm ci'`.
2. Generate Prisma Client:
   `sudo -u <deploy-user> -H bash -lc 'cd /srv/raccoon/backend && npx prisma generate'`.
3. Run production migrations with `DATABASE_URL` from the env file, using the
   root-shell wrapper from §2 (never as the service user).
4. Build the backend:
   `sudo -u <deploy-user> -H bash -lc 'cd /srv/raccoon/backend && npm run build'`.
5. Remove dev dependencies, then verify the env file:
   `sudo -u <deploy-user> -H bash -lc 'cd /srv/raccoon/backend && npm prune --omit=dev'`
   and `sudo chown root:root /etc/raccoon/raccoon-api.env && sudo chmod 600 /etc/raccoon/raccoon-api.env`.
   `NODE_ENV=production` must be present in that file before the service starts:
   it enables Secure cookies and keeps the API from trying to load the pruned
   `dotenv` devDependency. The load is guarded (a missing `dotenv` only logs a
   warning), but the process environment must still supply `JWT_SECRET` and
   `DATABASE_URL`.
6. **Bootstrap the first production admin after migrations (step 3) and after
   the prune in step 5.** The script only needs runtime dependencies
   (`@prisma/client` and `bcryptjs`), so it runs in the pruned production tree.
   Run it as the deploy user, from `backend/`, with the production environment
   loaded (the same root-shell wrapper as §2; the value is never printed):

   ```bash
   sudo bash -c '
     set -a; . /etc/raccoon/raccoon-api.env; set +a
     export HOME=/home/<deploy-user>
     cd /srv/raccoon/backend
     exec runuser -u <deploy-user> --preserve-environment -- npm run admin:bootstrap
   '
   ```

   The command requires a real terminal. It refuses non-TTY input, prompts for
   the name, email, and a hidden password (minimum 12 characters), shows the
   sanitized target database (host, port, and database name only), and asks you
   to type `CREATE`. It creates the first admin with bcrypt cost 10 and never
   modifies an existing admin. If the `admin` table is missing, it tells you to
   run `npx prisma migrate deploy` first. Re-running it after an admin exists is
   a no-op.

   **Do NOT run `npm run seed` or `npx prisma db seed` for a production
   bootstrap.** The seed writes demo content — the sample branch, every menu
   category and product, sample stories, sample events, and eight sample wall
   photos (`prisma/seed.ts`) — so it is for local or demo environments only.
   The seed also refuses to run when `NODE_ENV=production`.
   `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` are seed-only and must not be used
   for production. Never put an admin password in the environment or on the
   command line.
7. Install and start the API unit (§4.1), then `journalctl -u raccoon-api -n 50`:
   - Invalid config prints `Refusing to start. Invalid configuration:` plus one line per problem, then exits 1.
   - Valid config prints at most `Configuration warning:` lines, then `Raccoon Coffee backend running on 127.0.0.1:<port>`.

Frontend (steps 8–11 also run as the deploy user):

8. From `frontend/`, install and build:
   ```bash
   sudo -u <deploy-user> -H bash -lc 'cd /srv/raccoon/frontend && npm ci && BACKEND_URL=http://127.0.0.1:3001 npm run build && npm prune --omit=dev'
   ```
   `next.config.js` rewrites `/api/*` to `BACKEND_URL` (default
   `http://127.0.0.1:3001`), and the same variable is used by server-side
   fetches (`lib/site-images.ts`). The rewrite destination is baked in at build
   time; changing `BACKEND_URL` later requires a rebuild.
9. Make sure `.next/cache` exists and is writable by the service user while the
   build output stays owned by the deploy user (so the next build can replace
   it):
   ```bash
   sudo install -d -o <deploy-user> -g <service-group> -m 2770 /srv/raccoon/frontend/.next/cache
   sudo chgrp -R <service-group> /srv/raccoon/frontend/.next
   sudo chmod -R g+rX /srv/raccoon/frontend/.next
   sudo chmod -R g+w /srv/raccoon/frontend/.next/cache
   ```
   `install -d` also creates `.next/cache` when the build did not.
10. If an optional `/etc/raccoon/raccoon-web.env` is used, set
    `BACKEND_URL=http://127.0.0.1:3001` there too, owner
    `root:<service-group>`, `chmod 640`. This covers server-side fetches only;
    the `/api/*` rewrite comes from step 8's build environment.
11. Install and start the frontend unit (§4.2), then
    `journalctl -u raccoon-web -n 50`.
    Next.js logs `Ready` and the listening address; a build error here means
    `npm run build` did not complete in step 8.

Both:

12. Install Nginx in two phases (see §5): bootstrap HTTP-only site first,
    obtain the certificate with Certbot, then install the final HTTPS site.
    Run `sudo nginx -t` before every reload.
13. Smoke test behind Nginx: `curl -fsS https://<domain>/api/health` and open
    `https://<domain>/` in a browser.
14. Confirm both services listen on loopback only:
    `sudo ss -ltnp | grep -E ':(3000|3001)\b'`.
15. Confirm `git ls-files | grep -i '\.env$'` is empty in the checkout (no tracked env files).

## 4. systemd units

Install each unit only after the step that produces what it runs: the API unit
after the backend build, migration, and prune (§3 steps 1–6), the frontend unit
after the frontend build (§3 steps 8–9). `ReadWritePaths=` requires the path to
exist before start: a missing `/var/lib/raccoon/uploads` or `.next/cache` makes
the unit fail with a namespacing error.

### 4.1 API unit

1. Copy the template and replace every `<...>` placeholder (`<service-user>`,
   `<service-group>`, `<deploy-path>`, `<node-path>`,
   `<absolute-upload-directory>`):

   ```bash
   sudo cp /srv/raccoon/backend/deployment/raccoon-api.service.example \
     /etc/systemd/system/raccoon-api.service
   sudoedit /etc/systemd/system/raccoon-api.service
   ```

   `<node-path>` is the absolute path to Node (systemd does not use the login
   shell PATH); resolve it with `command -v node` as the deploy user.

2. Confirm the prerequisites the unit relies on:

   - `/etc/raccoon/raccoon-api.env` exists, `root:root`, `chmod 600`, and
     contains `NODE_ENV=production`, `PORT=3001`, `DATABASE_URL`, `JWT_SECRET`,
     `TRUST_PROXY=1`, `UPLOAD_DIR=/var/lib/raccoon/uploads`.
   - `/var/lib/raccoon/uploads` exists, owned by `<service-user>` with mode 750.
   - Migrations from §3 step 3 have completed.

3. Reload systemd, then enable and start the API:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now raccoon-api
   systemctl status raccoon-api --no-pager
   journalctl -u raccoon-api -n 50 --no-pager
   curl -fsS http://127.0.0.1:3001/api/health
   ```

   Expected: `Raccoon Coffee backend running on 127.0.0.1:3001`.

### 4.2 Frontend unit

1. Copy the template and replace the same placeholders:

   ```bash
   sudo cp /srv/raccoon/backend/deployment/raccoon-web.service.example \
     /etc/systemd/system/raccoon-web.service
   sudoedit /etc/systemd/system/raccoon-web.service
   ```

2. Confirm the prerequisites:

   - `/srv/raccoon/frontend/.next` exists from the build in §3 step 8.
   - `/srv/raccoon/frontend/.next/cache` exists and is writable by
     `<service-user>` (see §3 step 9).
   - Optional `/etc/raccoon/raccoon-web.env` is `root:<service-group>`,
     `chmod 640`, and holds the runtime `BACKEND_URL`.

3. Reload systemd, then enable and start the frontend:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable --now raccoon-web
   systemctl status raccoon-web --no-pager
   journalctl -u raccoon-web -n 50 --no-pager
   ```

   Expected: Next.js logs `Ready` and the listening address.

### 4.3 Verify both units

```bash
sudo ss -ltnp | grep -E ':(3000|3001)\b'
```

Both sockets must show `127.0.0.1` — never `0.0.0.0` or `[::]`. On later code
deploys, restart both units. `daemon-reload` is only needed when a unit file
itself changed:

```bash
sudo systemctl restart raccoon-api raccoon-web
```

## 5. Nginx

Bootstrap order matters. `raccoon-nginx.conf.example` references
`/etc/letsencrypt/live/<domain>/`, so `nginx -t` fails if it is installed before
the certificate exists.

Phase 1 — HTTP-only, valid without TLS:

```bash
sudo install -d -o root -g root -m 755 /var/www/html
sudo cp /srv/raccoon/backend/deployment/raccoon-nginx-bootstrap.conf.example /etc/nginx/sites-available/raccoon.conf
sudo ln -sfn /etc/nginx/sites-available/raccoon.conf /etc/nginx/sites-enabled/raccoon.conf
sudo nginx -t && sudo systemctl reload nginx
```

The bootstrap site serves the Certbot webroot challenge and proxies `/api/` and
`/` over plain HTTP so the app can be checked. Admin login does not work over
HTTP (Secure cookies are only sent over HTTPS), so this phase is temporary.

Phase 2 — obtain the certificate:

```bash
sudo certbot certonly --webroot -w /var/www/html -d <domain>
sudo certbot renew --dry-run
```

Phase 3 — install the final HTTPS site:

```bash
sudo cp /srv/raccoon/backend/deployment/raccoon-nginx.conf.example /etc/nginx/sites-available/raccoon.conf
sudo nginx -t && sudo systemctl reload nginx
curl -fsS https://<domain>/api/health
```

Final site properties:

- port 80 serves the ACME challenge and redirects everything else to HTTPS,
- port 443 proxies `/api/` to `127.0.0.1:3001` and `/` to `127.0.0.1:3000`,
- forwarded headers: `Host`, `X-Real-IP`, `X-Forwarded-For`,
  `X-Forwarded-Proto`, `X-Forwarded-Host`,
- `client_max_body_size 6m` (the API caps uploads at 5 MB),
- TLS certificates come from Certbot (`/etc/letsencrypt/live/<domain>/`); do not
  commit certificates or keys.

With one Nginx hop, set `TRUST_PROXY=1` in the API env file so rate limiting
sees real client IPs. Enable HSTS only after HTTPS is confirmed on the real
domain. If the certificate is renewed, only a reload is needed
(`sudo systemctl reload nginx`); Certbot's deploy hook normally does this.

## 6. Backups

Follow `BACKUP.md`: `mysqldump --single-transaction` plus a copy of
`/var/lib/raccoon/uploads`, transferred off the VPS, verified (checksums, table
counts), and restore-tested into a scratch database. Backups are not part of the
deploy checklist above because they must be scheduled and monitored separately.

## 7. Startup validation behavior (M-11)

`backend/src/config/config.validation.ts` runs before Nest loads:

- Hard failures (process exits 1, no secrets/connection strings echoed):
  - `JWT_SECRET` missing, shorter than 32 chars, or a known placeholder (H-5 rules, unchanged).
  - `DATABASE_URL` missing, not a valid `mysql://`/`mariadb://` URL, missing host/db, or still containing `<placeholder>` text.
  - `PORT` / `TRUST_PROXY` set but not valid integers; `UPLOAD_DIR` pointing at an existing file.
  - `NODE_ENV` set to an unrecognized value.
- Warnings (server still starts, visible in the journal):
  - production without `TRUST_PROXY` (rate limiting would see only the proxy IP),
  - `TRUST_PROXY` above 1 hop,
  - `NODE_ENV` unset (Secure cookies never enabled).

## 8. Not verified by these templates

These files are templates only. Nothing here has been run on a VPS. The
following remain **unverified** until tested on the real server:

- systemd units starting successfully (paths, user, permissions, hardening,
  `TimeoutStopSec`, `StartLimit*`),
- loopback-only binding (`ss` output must show `127.0.0.1`, not `0.0.0.0`/`[::]`),
- Nginx syntax and reload, the HTTP-only bootstrap site, Certbot issuance and renewal,
- HTTPS login flow (Secure cookies require HTTPS),
- backup, off-VPS transfer, and restore,
- firewall rules and disk/RAM limits.
