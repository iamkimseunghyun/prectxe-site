# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Project summary

- Framework: Next.js (App Router) with TypeScript and Bun
- Styling: Tailwind CSS + PostCSS; Prettier with tailwindcss plugin
- Data: Prisma (PostgreSQL); Program-first domain model
- Paths: uses @/_ alias to src/_

Commands

- Install
  - bun: bun install
  - npm: npm install
- Develop
  - bun run dev
- Build and run
  - bun run build
  - bun run start
- Lint, types, format
  - bun run lint
  - bun run type-check
  - bun run format
- Prisma
  - Generate client: bunx prisma generate
  - Apply dev migration: bunx prisma migrate dev -n "<message>"
  - Studio: bunx prisma studio
- Project scripts
  - Run TypeScript scripts with repo config:
    - bunx ts-node -P tsconfig.scripts.json scripts/migrate-legacy-projects-to-programs.ts
- Tests
  - No test runner is configured yet. AGENTS.md notes Vitest as the preferred stack; if/when added:
    - run all: bunx vitest run
    - run a single file: bunx vitest run path/to/file.test.ts
    - run by name: bunx vitest run -t "test name"

Environment

- Required
  - DATABASE_URL (Postgres)
  - CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID
  - CLOUDFLARE_IMAGE_STREAM_API_TOKEN
- Feature toggle
  - ENABLE_PROGRAM_REDIRECTS=1 enables legacy → Programs redirects (see Architecture > Routing & redirects)

Architecture overview

- App Router and pages
  - Next.js App Router under src/app with route groups (e.g., (page), (auth), etc.)
  - Sitemap and middleware in src/app/sitemap.ts and src/middleware.ts
- Domain modules
  - Feature code lives in src/modules/<domain> with
    - server/actions.ts for data mutations and queries
    - ui/{views,section,components} for React UI
  - Shared building blocks in src/components and src/hooks
  - Shared utilities and schemas in src/lib (e.g., src/lib/schemas/\*, src/lib/db/prisma.ts)
  - Use @/_ import alias pointing to src/_ (see tsconfig.json)
- Data model (Prisma)
  - PostgreSQL via Prisma (prisma/schema.prisma)
  - Program-centric model: Program with ProgramImage and ProgramCredit; Article for journal entries
  - Legacy Event/Project/Venue models remain while migrating to Program; some fields on Program (e.g., venue, organizer) are free-text to simplify IA
  - After schema edits: bunx prisma migrate dev and bunx prisma generate
- Styling and formatting
  - Tailwind configured via tailwind.config.js and postcss.config.mjs; darkMode class strategy
  - Prettier enforces code style and sorts Tailwind classes via prettier-plugin-tailwindcss
- Images
  - next/image is configured unoptimized with remotePatterns (e.g., imagedelivery.net for Cloudflare Images)
- Routing & redirects
  - When ENABLE_PROGRAM_REDIRECTS=1:
    - /projects/:slug → /programs/:slug
    - /events/:slug → /programs/:slug
    - /discover → /programs?status=upcoming
    - /archive → /programs?status=completed

Important references

- README.md
  - Quick start commands (bun run dev/build/start) and Prisma usage
  - Information architecture: Programs feed at /programs with upcoming/completed, Program detail at /programs/[slug], Journal at /journal
  - Admin: /admin, /admin/programs, /admin/journal
  - Cloudflare Images behavior: one-shot upload URLs with retry/progress
- AGENTS.md
  - Project structure conventions (App Router, modules, shared libs)
  - Commands summary (dev/build/lint/format/type-check, Prisma)
  - ESLint behavior: TypeScript rules with underscore-ignored unused vars
  - Testing note: Vitest preferred when added
- docs/design/update-plan.md
  - Ongoing site renewal plan for Programs feed; includes migration status and next tasks

Notes for agents

- Use Bun (>=1.0) as primary runtime; npm is acceptable for install only
- Prefer @/\* imports over relative paths
- For any schema changes or data migrations, coordinate with Prisma commands above
