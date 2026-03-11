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

- [x] Extract tokens to Tailwind theme + CSS vars (bg, panel, text, border) — globals.css에 HSL 기반 컬러 토큰 + dark mode 구현 완료.
- [ ] A11y pass: focus-visible 스타일, aria for icon buttons/badges, AA contrast, reduced motion.

## Phase 7 — Data Model & CMS

- [x] Enums: ProgramType, ProgramStatus.
- [x] Models/relations: Program, ProgramImage, ProgramCredit, Article.
- [x] Migration A (dev): applied via `prisma db push` + generate.
- [x] Migration B: Project→Program, Event→Program 데이터 마이그레이션 완료.
- [x] Migration C: 레거시 Project/Event 모델·쿼리 전부 제거됨.
- [x] Migration D: 옛 테이블 드랍 완료 (schema에 Project/Event 모델 없음).

## Phase 8 — SEO & Redirects

- [x] Canonical URL: programs, journal, artists, venues, artworks 상세 페이지 설정 완료.
- [x] JSON‑LD 구조화 데이터: program (Event), article, artist, artwork, venue 스키마 구현 (`src/components/seo/`).
- [x] OG 이미지 자동 생성: programs/journal `opengraph-image.tsx` (Next.js ImageResponse).
- [x] Redirects (`ENABLE_PROGRAM_REDIRECTS=1`): next.config.ts에 4개 permanent redirect 설정 완료.

## Phase 9 — Performance & Analytics

- [x] Vercel Analytics (`@vercel/analytics`) + Speed Insights (`@vercel/speed-insights`) 루트 레이아웃 적용.
- [x] Cloudflare Images CDN 최적화 (unoptimized: true, 변환은 CDN에서 처리).
- [ ] `next/image` presets 감사 (LCP hero 이미지 priority/sizes 검증) — 선택 사항.

## Phase 10 — Release

- [ ] `bun run type-check && bun run check && bun run build` 최종 확인.
- [ ] Staging QA → Production deploy.

## Remaining (Optional)

- [ ] A11y: focus-visible 스타일, aria-labels, reduced motion 지원.
- [ ] next/image LCP 최적화 검증 (field data 기반).
- [ ] Programs 페이지에 Upcoming + Completed 동시 표시 변형.
