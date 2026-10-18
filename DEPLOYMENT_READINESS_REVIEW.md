# Deployment Readiness Review — Raccoon Coffee

Review date: 2026-10-19
Scope: production deployment readiness for one VPS (2 vCPU, 4 GB RAM, 60–80 GB SSD)
Mode: source review plus fixes applied in the working tree. No database, build,
migration, seed, deployment, or VPS command was run.

---

## 1. Deployment Readiness Status

**NOT READY for go-live yet.** The source-level deployment blockers are fixed in
this local commit. The remaining work is VPS provisioning and runtime
verification; nothing in this repository proves that the server side works.

What changed since the first review:

- the backend install/build/migrate/prune order is corrected;
- the runtime security fixes are committed in `2970162`;
- the local auth/cookie artifacts are gone and ignored by exact filename;
- frontend, Nginx, TLS, and backup templates now exist;
- the production admin bootstrap is create-only, interactive, and works in the
  pruned production dependency tree;
- the demo seed refuses to run with `NODE_ENV=production`.

What is still not proven:

- systemd units, paths, users, permissions, and hardening on the real VPS;
- Nginx syntax/reload, Certbot issuance, renewal, and HTTPS login;
- database provisioning, migrations, and the admin bootstrap against the real
  production database;
- backup, off-VPS transfer, and a restore test;
- firewall rules, loopback-only binding, disk/RAM limits, and real load.

---

## 2. Blockers and their current state

### B1 — Backend install order is broken on a clean server — FIXED

The old order ran `npm ci --omit=dev` before `npm run build` and
`prisma migrate deploy`. `@nestjs/cli`, `typescript`, `prisma`, and `ts-node`
are `devDependencies`, so those steps could not run.

Current `backend/deployment/README.md` §3 installs all dependencies, generates
Prisma Client, migrates, builds, prunes, and only then bootstraps the admin.
`backend/package.json` exposes `admin:bootstrap`.

### B1b — `dotenv` after `npm prune --omit=dev` — NOT A BLOCKER

`backend/src/auth/constants.ts` loads `dotenv` lazily, only when
`NODE_ENV !== 'production'`, inside a `try/catch` that ignores `MODULE_NOT_FOUND`
and logs a warning. `NODE_ENV=production` in the systemd env file skips the load
entirely, so a missing devDependency cannot crash the API.

### B2 — Runtime security fixes were uncommitted — FIXED

Commit `2970162` (`fix(security): harden session revocation and upload staging`)
contains the staging-file reaper, its module registration, and the stale-logout
revocation fix. Deploy from that commit or a later one; never from a dirty tree.

### B3 — Local auth/cookie artifacts — FIXED

The previous `backend/fresh-login.json`, `fresh.txt`, `jar.txt`,
`login-body.json`, and `stale.txt` files are no longer present. Exact patterns
for those filenames were added to `.gitignore` so a future manual test cannot be
committed accidentally.

### B4 — Production environment values — PARTIAL

The templates define the required values:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=mysql://<user>:<password>@127.0.0.1:3306/raccoon
JWT_SECRET=<generated secret>
TRUST_PROXY=1
UPLOAD_DIR=/var/lib/raccoon/uploads
```

`/etc/raccoon/raccoon-api.env` itself does not exist in this repository and was
not created or read here. It must be created on the VPS as `root:root`,
`chmod 600`. Without HTTPS, `Secure` cookies are not sent and admin login fails.

### B5 — Deployment artifacts — FIXED AS TEMPLATES, NOT APPLIED

`backend/deployment/` now contains:

- `raccoon-api.service.example` (systemd API unit),
- `raccoon-web.service.example` (systemd Next.js unit),
- `raccoon-api.env.example`,
- `raccoon-nginx-bootstrap.conf.example` (HTTP-only, for the first certificate),
- `raccoon-nginx.conf.example` (80→443, `/api/`→3001, `/`→3000),
- `BACKUP.md` (dump, uploads copy, off-VPS transfer, restore test).

These are templates. They were not installed or started on a VPS.

### B6 — VPS verification — OPEN (cannot be closed from this repository)

The remaining go-live blockers are operational:

- provision users, directories, database, and the root-owned env file;
- run `npm ci`, `prisma generate`, `migrate deploy`, `build`, `prune`, and the
  admin bootstrap on the VPS;
- install and start both units; confirm `ss` shows `127.0.0.1:3000` and
  `127.0.0.1:3001`, not `0.0.0.0` or `[::]`;
- install the bootstrap Nginx site, obtain the certificate, install the final
  HTTPS site, and run `nginx -t`;
- smoke test `https://<domain>/api/health`, the homepage, and an HTTPS admin
  login;
- create a backup, copy it off the VPS, and restore it into a scratch database;
- enable the firewall and confirm disk/RAM monitoring.

---

## 3. Optional improvements (deferred)

| Item | Current state | Why deferred |
|---|---|---|
| Global rate limit | 100 req/60s in `backend/src/app.module.ts` | Not load-tested. Homepage SSR, image optimizer, and public traffic share the same `127.0.0.1` bucket. Raise the limit, add `@SkipThrottle()` to upload serving, or cache the homepage after measuring. |
| `frontend/.env.example` | Absent | `BACKEND_URL` is documented in `backend/deployment/README.md` and the web unit. Add the file if local frontend setup needs a template. |
| Config error aggregation | `AuthModule` resolves `JWT_SECRET` at import, before `validateConfig()` | Still fail-closed; the operator may see a stack trace instead of the aggregated report. Does not block deploy. |
| Upload quota/retention | 5 MB per file, 5 uploads/min, no disk quota | Add a quota, disk monitoring, and retention for `PENDING`/`REJECTED` photos after go-live. |
| Node version | Local Node 24.19.0; no `engines` field | Use Node 20/22 LTS on the VPS and consider pinning `engines`. |
| Swap and tuning | 4 GB RAM | Add 2 GB swap; tune `innodb_buffer_pool_size`, journald limits, and disk alerts. |
| Nginx hardening | HSTS commented out; no `/_next/static` cache block | Enable HSTS only after HTTPS is confirmed on the real domain. Add static caching after measuring. |
| Content/SEO gaps | placeholder logo, mock `LocationSection`, no `metadataBase` | Not a deploy blocker. |
| Repo hygiene | `backend/SECURITY.md` untracked; `frontend/admin.html` tracked but unused; `backend/test/` ignored | `backend/SECURITY.md` was deliberately excluded from this commit. Decide track-or-ignore separately. |

---

## 4. Files in this local commit

| File | Change |
|---|---|
| `.gitignore` | Ignore filled-in deployment env files and the local auth/cookie artifacts. |
| `backend/.env.example` | Clarify that `SEED_ADMIN_*` is local/demo only and production uses `admin:bootstrap`. |
| `backend/deployment/README.md` | Correct install order, prune-before-bootstrap, permissions, loopback binding, Nginx/TLS phases, and backup reference. |
| `backend/deployment/raccoon-api.env.example` | Document `HOST`, the upload directory requirement, and the production admin path. |
| `backend/deployment/raccoon-api.service.example` | Add `StartLimit*`, `TimeoutStopSec`, and the runtime-user notes. |
| `backend/deployment/raccoon-web.service.example` | New Next.js unit bound to `127.0.0.1:3000` with a writable `.next/cache`. |
| `backend/deployment/raccoon-nginx-bootstrap.conf.example` | New HTTP-only bootstrap site for the first certificate. |
| `backend/deployment/raccoon-nginx.conf.example` | New final HTTPS site and reverse proxy. |
| `backend/deployment/BACKUP.md` | New database + uploads backup, verification, and restore procedure. |
| `backend/package.json` | Add `admin:bootstrap`. |
| `backend/scripts/bootstrap-admin.js` | New interactive, create-only first-admin bootstrap. |
| `backend/src/main.ts` | Bind the API to `HOST` (default `127.0.0.1`). |
| `backend/prisma/seed.ts` | Refuse to run the demo seed when `NODE_ENV=production`. |
| `frontend/lib/site-images.ts` | Default `BACKEND_URL` to `127.0.0.1:3001`. |
| `frontend/next.config.js` | Use `BACKEND_URL` for the `/api/*` rewrite. |
| `REMEDIATION_PLAN.md` | Record the verified security-task status (documentation only). |
| `DEPLOYMENT_READINESS_REVIEW.md` | This updated review. |

`backend/SECURITY.md` is intentionally **not** included: it is an untracked,
stale AI audit artifact, not a deployment file.

---

## 5. Deployment order (one VPS)

1. **Provision** — Ubuntu 22.04/24.04, 2 vCPU, 4 GB RAM, 60–80 GB SSD, 2 GB swap.
   Install Nginx, MySQL 8.0 or MariaDB 10.6/11.4, Node 20/22 LTS, git, certbot.
2. **Database** — create `raccoon` with `utf8mb4` / `utf8mb4_unicode_ci` and a
   dedicated application user. Do not use root for the app.
3. **Users and directories** — create the deploy user and the non-login service
   user, `/srv/raccoon`, `/var/lib/raccoon/uploads`, and `/etc/raccoon` as
   described in `backend/deployment/README.md` §1.
4. **Clone** — checkout the commit that contains `2970162` or a later one. Do
   not deploy from a dirty tree.
5. **Backend env** — create `/etc/raccoon/raccoon-api.env` (`root:root`, `600`)
   with the values from B4.
6. **Backend install, build, prune**
   ```bash
   cd /srv/raccoon/backend
   npm ci
   npx prisma generate
   npx prisma migrate deploy
   npm run build
   npm prune --omit=dev
   ```
7. **First admin** — run `npm run admin:bootstrap` from an interactive terminal
   with the production environment loaded, after the prune. The script prompts
   for the password, never reads it from argv or the environment, shows only the
   sanitized database target, requires `CREATE`, and never updates an existing
   admin.
   Do **not** run `npm run seed` or `npx prisma db seed` in production. The seed
   inserts demo content and now refuses to start with `NODE_ENV=production`.
8. **Backend service** — install the API unit, `systemctl daemon-reload`,
   `systemctl enable --now raccoon-api`, then
   `curl -fsS http://127.0.0.1:3001/api/health`.
9. **Frontend** — in `/srv/raccoon/frontend`, build with
   `BACKEND_URL=http://127.0.0.1:3001`, prune, make `.next/cache` group-writable
   by the service user, install the web unit, and start it.
10. **Nginx** — install the bootstrap HTTP site, obtain the certificate with
    Certbot, install the final HTTPS site, run `sudo nginx -t`, then reload.
11. **Firewall** — allow 22/80/443; deny 3000/3001/3306 from outside.
12. **Smoke test** — `curl -fsS https://<domain>/api/health`, open the homepage,
    log in over HTTPS, upload an image, approve/delete it, restart both services,
    and confirm uploads persist.
13. **Backup** — schedule the procedure in `BACKUP.md`, copy off the VPS, and
    test the restore into a scratch database.

---

## 6. Verification performed for this review

- `node --check backend/scripts/bootstrap-admin.js` — syntax check.
- `node -e "JSON.parse(...)"` on `backend/package.json` — JSON validation.
- `git diff --check` — whitespace/conflict-marker check.
- Source inspection of the bootstrap, systemd templates, Nginx templates, env
  template, backup procedure, seed guard, and frontend backend URL handling.

Not run: database access, migrations, seed, `npm ci`, `npm run build`, typecheck,
test suite, systemd, Nginx, Certbot, or any VPS command.

Consequently, the VPS items in B6 remain **unverified** and must not be reported
as ready until they are executed on the real server.
