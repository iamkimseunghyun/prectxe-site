# Repository Guidelines

## Project Structure & Module Organization

- App Router in `src/app` (e.g., `src/app/(page)/*`, `src/app/(home)/*`, `src/app/(content)/*`).
- Features in `src/modules/<domain>/{server|ui}/...` (e.g., `server/actions.ts`, `ui/{views,components,section}`).
- Shared code in `src/components`, `src/hooks`, `src/lib` (`src/lib/schemas` for Zod; `src/lib/db/prisma.ts` for Prisma client).
- Admin components in `src/components/admin/` (AdminNav, AdminDataTable, AdminHeader, etc.).
- Assets in `public/`. Prisma schema and migrations in `prisma/`.
- Use `@/*` path alias for internal imports.
- Programs index at `/programs`; details at `/programs/[slug]`.
- Journal index at `/journal`; details at `/journal/[slug]`.
- Tests live near sources in `__tests__/` or as `*.test.ts(x)`.

## Build, Test, and Development Commands

- `bun run dev` — Start Next.js (Turbopack) for local dev.
- `bun run build` — Run `prisma generate` then `next build`.
- `bun run start` — Serve the production build.
- `bun run type-check` — TypeScript type checking.
- `bun run lint` — Biome linter (`biome lint .`).
- `bun run format` — Biome formatter (`biome format --write .`).
- `bun run check` — Biome check (lint + format).
- Prisma: `bunx prisma migrate dev -n "<msg>"`, `bunx prisma generate`, `bunx prisma studio`.
- Redirects: set `ENABLE_PROGRAM_REDIRECTS=1` to map `/discover|/archive → /programs` and legacy routes to programs.

## Coding Style & Naming Conventions

- TypeScript (strict). 2-space indent, single quotes, print width 80.
- Biome for linting and formatting (replaced ESLint + Prettier).
- Config: `biome.json` with Tailwind CSS support (`css.parser.tailwindDirectives: true`).
- Filenames: kebab-case (e.g., `program-card.tsx`). Components/hooks in PascalCase; hooks start with `use*`.
- Tailwind CSS for styling.

## Testing Guidelines

- Preferred: Vitest + React Testing Library (when added).
- Place tests beside code in `__tests__/` or as `*.test.ts(x)`.
- Keep tests fast and deterministic. Example: `bunx vitest run`.

## Commit & Pull Request Guidelines

- Commits: concise, present tense. Optional scope: `[module] 메시지`.
- Example: `events: fix date parsing`.
- Before pushing: `bun run type-check && bun run check`.
- PRs: clear description, linked issues, UI screenshots, and notes on DB migrations (`prisma/migrations`) and env changes.

## Security & Configuration Tips

- Required env: `DATABASE_URL`, `CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID`, `CLOUDFLARE_IMAGE_STREAM_API_TOKEN`. Never commit `.env*`.
- After editing `prisma/schema.prisma`, run `bunx prisma migrate dev` and `bunx prisma generate`.
- Cloudflare upload: see `src/lib/cdn/cloudflare.ts` (one‑shot; forms finalize/retry with per-item progress).

## UI Layout

- **No traditional header**: Navigation is minimal and contextual.
- **Admin header**: Floating button (top-right), visible only to logged-in admins.
- **GlobalSearch**: Floating button (bottom-right), `⌘K` shortcut supported.
- **Homepage**: Full-screen hero with inline navigation (Archive, Journal, About).

## Admin & Authoring

- Admin at `/admin` (ADMIN only). Tab-based navigation for sections.
- Manage programs `/admin/programs` (slug collision checks).
- Manage journal `/admin/journal` (cover upload retry).
- Manage artists `/admin/artists`, venues `/admin/venues`, artworks `/admin/artworks`.

## Development Log

- Timeline tracking in `docs/dev-log.md`.
- Update after significant changes for session continuity.

## Agent-Specific Instructions

- This file applies to the entire repository. Follow structure, naming, and commands above.
- Check `docs/dev-log.md` for recent changes and context.
