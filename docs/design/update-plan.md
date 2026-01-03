# Site Renewal Plan — Programs Feed

> Goal: Replace calendar‑centric UX with a lean, feed‑first model while improving IA, accessibility, and performance. This plan tracks end‑to‑end delivery.

## Today — Completed

- About: redesigned hero/sections/CTA with modern layout and icons.
- Programs: simplified feed (removed type/city/status UI), added “if no upcoming → show completed” fallback.
- Data migration: added and ran Project→Program copy script on dev DB; Program schema applied (db push).
- Program detail: removed Add to Calendar; redesigned Credits with avatar + role; link to artist detail; bilingual names.
- Gallery: added shadcn Dialog + Embla carousel modal with captions and index.
- Global: added formatArtistName/artistInitials util; applied across views (artists, artworks, projects, forms, admin, search); added AGENTS.md.

## Phase 0 — Alignment

- [x] Approve IA: Home, Programs, Journal, About (no Calendar top‑nav).
- [x] Wireframe update in `src/lib/design/wireframe.jsx` (Next Up + Programs feed).
- [ ] Define visual tone (minimal vs editorial), motion intensity, and dark/light usage.

## Phase 1 — IA & Navigation

- [x] Update routes: unify feed → `/programs`.
- [x] Rename menu labels to “Programs”.
- [x] 301 redirects ready (toggle via env).

## Phase 2 — Home (Next Up)

- [x] Next Up list (3–6) / Journal highlights.

## Phase 3 — Programs Feed

- [x] Infinite scroll / loading skeleton.
- [x] Simplify UI: remove type/city/status filters; rely on global search.
- [x] Fallback: if no upcoming, show completed.

## Phase 4 — Program Detail

- [x] Template: Hero → Story → Credits → Gallery → Map.
- [x] Credits redesign with artist links; bilingual names.
- [x] Gallery modal (shadcn Dialog + Embla carousel).
- [x] Remove “Add to Calendar”; keep Share in header.

## Phase 5 — Journal

- [x] Journal index + detail (`/journal/[slug]`), Admin CRUD.

## Phase 6 — Design System & A11y

- [ ] Extract tokens to Tailwind theme + CSS vars (bg, panel, text, border).
- [ ] A11y pass: focus rings, aria for icon buttons/badges, AA contrast, reduced motion.

## Phase 7 — Data Model & CMS

- [x] Enums: ProgramType, ProgramStatus.
- [x] Models/relations: Program, ProgramImage, ProgramCredit, Article.
- [x] Migration A (dev): applied via `prisma db push` + generate.
- [x] Migration B (partial): Project→Program (images/credits/venue) copied; Event→Program pending.
- [ ] Migration C: switch remaining legacy queries fully to Program (if any left).
- [ ] Migration D: drop old tables after verification and backup.
- [ ] Seed scripts and admin ingestion (optional).

## Phase 8 — SEO & Redirects

- [ ] Canonical per `programs/[slug]`; JSON‑LD `Event` for upcoming only.
- [ ] Verify redirects with `ENABLE_PROGRAM_REDIRECTS=1`:
  - `/discover` → `/programs?status=upcoming`, `/archive` → `/programs?status=completed`
  - `/projects/:slug` → `/programs/:slug`, `/events/:slug` → `/programs/:slug`

## Phase 9 — Performance & Analytics

- [ ] `next/image` presets audit for LCP; refine priority/sizes.
- [ ] RUM/analytics: pageview + Program create/update, Journal publish.

## Phase 10 — Release

- [ ] `bun run type-check && bun run lint && bun run format && bun run build`.
- [ ] Staging QA → Production deploy; announce.

## Next Tasks

1. Event→Program data copy script (images/organizers→credits) and run on dev.
2. Verify and enable redirects in staging (`ENABLE_PROGRAM_REDIRECTS=1`).
3. A11y sweep: focus styles, aria-labels on icon buttons, color contrast.
4. Performance: validate hero/card `next/image` sizes and priorities with field data.
5. Optional: Program page variant to show both Upcoming and Completed sections on one screen.
6. Prepare legacy table drop migration after verification + DB backup.
