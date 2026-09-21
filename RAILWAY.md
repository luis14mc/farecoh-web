# Railway Deployment

The app is configured to run on [Railway](https://railway.app) using a Node.js standalone server.

## Architecture

- **Adapter:** `@astrojs/node` in `standalone` mode.
- **Entry:** `server.mjs` (custom HTTP server with graceful shutdown, cache headers, and compression).
- **Build output:** `dist/server/entry.mjs` (Astro standalone handler) and `dist/client/` (static assets).
- **Healthcheck:** `GET /health`.

## First deploy

1. Create a new Railway project from this GitHub repo.
2. Railway detects Nixpacks automatically; the `railway.toml` file pins the build and deploy commands.
3. Add the required environment variables (see below).
4. Set the public domain. The site URL is picked up from `PUBLIC_SITE_URL`.

## Required environment variables

Set these in the Railway service **Variables** tab:

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Railway Postgres auto-injects) |
| `SESSION_SECRET` | yes | Random 32+ char string for signing session cookies |
| `PUBLIC_SITE_URL` | recommended | Canonical site URL, e.g. `https://farecoh.org` |
| `WHATSAPP_PROVIDER` | optional | `twilio` or `meta` for staff alerts |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM` | optional | Twilio credentials |
| `FARECOH_NOTIFY_WHATSAPP_TO` | optional | Recipient for staff notifications |

Variables prefixed with `PUBLIC_` are exposed to the client.

## Database (Postgres)

The app uses a plain Postgres database provisioned in Railway. Schema and seed data live in `db/migrations/` and are applied automatically on every deploy via `pnpm run db:migrate` (idempotent — tracks applied files in `schema_migrations`).

To create the Postgres service:

1. In Railway, click **+ New → Database → PostgreSQL**.
2. Once provisioned, set `DATABASE_URL` on the web service via **Variables → Reference Variable**.
3. The first deploy will run the migrations and create all tables, RPCs, and seed data.

### Local development

```bash
docker run -d --name farecoh-pg \
  -e POSTGRES_USER=farecoh \
  -e POSTGRES_PASSWORD=farecoh \
  -e POSTGRES_DB=farecoh \
  -p 54321:5432 \
  postgres:17-alpine

export DATABASE_URL="postgres://farecoh:farecoh@localhost:54321/farecoh"
pnpm run db:migrate
```

## Build and run commands

Configured in `railway.toml`:

```toml
buildCommand = "pnpm install --frozen-lockfile && pnpm run build"
startCommand = "node ./server.mjs"
```

The server reads `HOST` and `PORT` from the environment (Railway injects `PORT` automatically). It defaults to `0.0.0.0:8080` if not set.

## Optimizations enabled

- **Compression:** `gzip` and `brotli` for HTML, JSON, XML, and SVG responses (skips already-compressed assets and small payloads).
- **Static asset caching:** `/_astro/*`, hashed filenames in `/images/`, and `/fonts/*` get `Cache-Control: public, max-age=31536000, immutable`.
- **Light cache for volatile static:** `/sitemap.xml`, `/robots.txt`, `/favicon.ico` get `Cache-Control: public, max-age=3600`.
- **Prefetch:** client-side prefetch on hover for faster navigation.
- **Inlined critical CSS:** Astro's `inlineStylesheets: "auto"`.
- **LightningCSS minification** for production CSS.

## Healthcheck

```
GET /health
→ 200 {"status":"ok","timestamp":"...","service":"farecoh-web"}
```

Railway hits this endpoint every 30 seconds by default. If a deploy fails to respond, Railway rolls back automatically.

## Local smoke test

```bash
pnpm install
pnpm run build
PORT=8080 HOST=0.0.0.0 node ./server.mjs

# in another terminal:
curl -sI http://localhost:8080/health
curl -sI -H "Accept-Encoding: gzip" http://localhost:8080/
```

## Logs and debugging

- All `console.log/error` output goes to Railway's build/runtime logs.
- The server logs `listening on http://HOST:PORT` on startup and prints shutdown messages on `SIGTERM`/`SIGINT`.
- Railway sends `SIGTERM` on deploy and restart; the server has a 10-second graceful shutdown window.

## Rolling back

Railway keeps the last successful deploy. Click **Deployments → Rollback** in the dashboard.
