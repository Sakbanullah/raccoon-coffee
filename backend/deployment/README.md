# Raccoon Coffee — Backend deployment notes (Linux/VPS, systemd)

Plain systemd + Nginx deployment. No Docker (deliberately out of scope).
Templates: `raccoon-api.service.example`, `raccoon-api.env.example` (this directory).
Everything marked `<...>` in the templates is a placeholder — fill in real
values on the server; never commit filled-in copies.

## 1. Files and permissions

| Item | Suggested | Why |
| --- | --- | --- |
| Env file | `/etc/raccoon/raccoon-api.env`, owner `root:root`, `chmod 600` | Holds `JWT_SECRET` and `DATABASE_URL`; must live outside the repo, systemd loads it before dropping privileges. |
| Service user | dedicated non-login user (e.g. `raccoon`, created with `useradd --system --no-create-home --shell /usr/sbin/nologin raccoon`) | Least privilege; no interactive shell. |
| Deploy dir | e.g. `/srv/raccoon` (git checkout + `npm ci --omit=dev` + `npm run build`) | Owner: the deploy user; the service only needs read/execute. |
| Upload dir | e.g. `/srv/raccoon-uploads` (set as `UPLOAD_DIR`, absolute path) | Separate from the code tree; the service user needs read/write; mounted with a disk quota if possible. |
| Port | any free port (e.g. 3001); the API binds on all interfaces — firewall it (`ufw deny <port>`) so only Nginx (local) reaches it | The API is not meant to be exposed directly. |

## 2. Database and migrations

- MySQL/MariaDB only (`mysql://` or `mariadb://` in `DATABASE_URL`).
- Run migrations explicitly during deploy, as the service user:
  `npx prisma migrate deploy` (from `backend/`). Never `db push`, never `migrate reset` on a server.
- Run migrations BEFORE `systemctl restart raccoon-api` so the new code never runs against an old schema.

## 3. Deploy checklist

1. Pull the new code into the deploy directory; `npm ci`; `npm run build`.
2. `npx prisma migrate deploy`.
3. Verify the env file: `sudo chmod 600 /etc/raccoon/raccoon-api.env` (and that it is still root-owned).
4. `sudo systemctl restart raccoon-api` and `journalctl -u raccoon-api -n 50`:
   - Invalid config prints `Refusing to start. Invalid configuration:` plus one line per problem, then exits 1.
   - Valid config prints at most `Configuration warning:` lines, then `Raccoon Coffee backend running on port <port>`.
5. Smoke test behind Nginx: `curl -fsS https://<domain>/api/health`.
6. Confirm `git ls-files | grep -i '\.env$'` is empty in the checkout (no tracked env files).

## 4. Nginx (reverse proxy) sketch

```nginx
server {
    server_name <domain>;
    client_max_body_size 6m;   # uploads are capped at 5MB by the API
    location /api/ {
        proxy_pass http://127.0.0.1:<port>;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

With one Nginx hop, set `TRUST_PROXY=1` in the env file so rate limiting sees
real client IPs.

## 5. Startup validation behavior (M-11)

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
