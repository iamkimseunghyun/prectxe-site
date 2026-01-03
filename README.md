# PRECTXE — Programs Feed Site

A lean, feed‑first Next.js app for discovering programs (exhibition/live/party) with a unified Programs feed, admin authoring, and Cloudflare Images.

## Quick Start

- Install: `bun install` (or `npm i`)
- Dev: `bun run dev`
- Build: `bun run build` → `bun run start`
- Prisma: `bunx prisma migrate dev -n "msg" && bunx prisma generate` (DB URL required)

## Information Architecture

- Programs feed: `/programs` (status chips: upcoming/completed; filters: type/city)
- Program detail: `/programs/[slug]`
- Journal: `/journal`, `/journal/[slug]`
- Global search: press `⌘K` / `Ctrl+K`

## Admin

- Dashboard: `/admin` (ADMIN only)
- Programs: `/admin/programs` (create/edit/delete, slug checks, image upload with retry/progress)
- Journal: `/admin/journal` (create/edit/delete, cover upload retry)

## Redirects

- Toggle with `ENABLE_PROGRAM_REDIRECTS=1` (env)
  - `/discover` → `/programs?status=upcoming`
  - `/archive` → `/programs?status=completed`
  - `/projects/:slug` | `/events/:slug` → `/programs/:slug`

## Cloudflare Images

- One‑shot upload URLs; forms auto‑retry with new URL on failure
- Per‑item progress for galleries; failed items show a retry button

## Env Vars

- `DATABASE_URL` — Postgres connection
- `CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID`, `CLOUDFLARE_IMAGE_STREAM_API_TOKEN`

## Notes

- Venues are free‑text on Program (legacy Venue model slated for removal)
- Sitemap/middleware exclude legacy events/projects; Programs is canonical
