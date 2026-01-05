# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure & Module Organization

- **App Router**: Routes in `src/app` organized by route groups:
  - `(home)/*` - Homepage and landing
  - `(content)/*` - Content pages (programs, journal)
  - `(auth)/*` - Authentication pages
  - `(page)/*` - Static pages
  - `(marketing)/*` - Marketing pages
- **Module Architecture**: Features organized in `src/modules/<domain>/{server|ui}/...`
  - `server/` - Server actions and data fetching (`actions.ts`)
  - `ui/` - Client components organized as `{views,components,section}`
  - Available modules: programs, journal, artists, venues, artworks, events, projects, auth, home, about
- **Shared Resources**:
  - `src/components` - Shared UI components and layout
  - `src/components/admin/` - Admin-specific components (AdminNav, AdminDataTable, AdminHeader)
  - `src/hooks` - Custom React hooks
  - `src/lib` - Utilities, schemas, database client
    - `src/lib/schemas` - Zod validation schemas
    - `src/lib/db/prisma.ts` - Prisma client instance
    - `src/lib/auth/session.ts` - Iron Session configuration
    - `src/lib/cdn/cloudflare.ts` - Cloudflare image upload utilities
- **Import Paths**: Use `@/*` alias (e.g., `@/lib/utils`, `@/components/ui/button`)
- **Key Routes**:
  - Programs: `/programs` (index), `/programs/[slug]` (detail)
  - Journal: `/journal` (index), `/journal/[slug]` (detail)
  - Admin: `/admin` (dashboard with tabs for programs, journal, artists, venues, artworks)
- **Tests**: Colocate with source in `__tests__/` or as `*.test.ts(x)` (Vitest when configured)

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

## Database & Data Model

- **Database**: PostgreSQL via Prisma ORM
- **Schema Location**: `prisma/schema.prisma`
- **Key Models**:
  - `Program` - Main content type (replaces legacy Event/Project models)
    - Fields: slug (unique), title, type (exhibition/live/party/workshop/talk), status (upcoming/completed), startAt, endAt
    - Relations: ProgramImage[], ProgramCredit[] (many-to-many with Artist)
    - Free-text fields: venue, organizer (legacy Venue model slated for removal)
  - `Article` - Journal entries with slug, title, body, cover, tags, publishedAt
  - `Artist` - Artist profiles with name (en/kr), biography, images
  - `User` - Authentication with role (ADMIN/USER), manages programs/articles
- **Legacy Models**: Event, Project (being phased out in favor of Program)
- **Migrations**: After schema changes, run `bunx prisma migrate dev -n "description"` then `bunx prisma generate`

## Authentication & Authorization

- **Session Management**: Iron Session (`src/lib/auth/session.ts`)
  - Cookie name: `prectxe`
  - Session fields: `id`, `name`, `isAdmin`
  - Password from env: `COOKIE_PASSWORD`
- **Protected Routes**: `/admin/*` requires `isAdmin: true`
- **Auth Flow**: Login/logout actions in `src/modules/auth/server/actions.ts`

## Image Upload Architecture

- **Provider**: Cloudflare Images API
- **Upload Flow** (`src/lib/cdn/cloudflare.ts`):
  1. Server generates one-shot upload URL via `getCloudflareImageUrl()`
  2. Client uploads directly to Cloudflare
  3. Forms implement auto-retry with new URL on failure
  4. Gallery uploads show per-item progress with retry buttons
- **Image URLs**: `https://imagedelivery.net/<account-hash>/<image-id>/public`
- **Important**: Upload URLs are single-use; forms must request new URL on retry

## Environment Variables

Required variables (never commit `.env*`):
- `DATABASE_URL` - PostgreSQL connection string
- `CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID` - Cloudflare account ID
- `CLOUDFLARE_IMAGE_STREAM_API_TOKEN` - Cloudflare API token
- `COOKIE_PASSWORD` - Iron Session encryption key (min 32 chars)
- `ENABLE_PROGRAM_REDIRECTS` - Set to `1` to enable legacy route redirects

## UI Layout & Navigation

- **No traditional header**: Navigation is minimal and contextual (redesigned 2026-01-04)
- **Admin Header** (`src/components/layout/header.tsx`):
  - Floating button (top-right `fixed right-4 top-4`)
  - Visible only to logged-in admins
  - Rounded pill style with backdrop blur
- **GlobalSearch** (`src/modules/home/ui/components/global-search.tsx`):
  - Floating button (bottom-right `fixed bottom-6 right-6`)
  - `⌘K` / `Ctrl+K` shortcut
  - Search across programs, artists, venues
- **Homepage**: Full-screen hero (`min-h-screen`) with inline navigation links
- **Removed**: Traditional nav bar, `--header-height` CSS variable (migration to Biome)

## Admin Interface

- **Dashboard**: `/admin` - Tab-based navigation (ADMIN role only)
- **Program Management**: `/admin/programs`
  - Create/edit/delete programs
  - Slug uniqueness validation
  - Multi-image upload with progress and retry
  - Artist credit management
- **Journal Management**: `/admin/journal`
  - Article authoring with markdown body
  - Cover image upload with retry
  - Tag management
  - Publish/unpublish control
- **Other Admin Pages**: `/admin/artists`, `/admin/venues`, `/admin/artworks`
- **Form Design**: Card-based sections (basic info, content, images, metadata) with required field indicators (`*`)

## Legacy Routes & Redirects

- **Toggle**: Set `ENABLE_PROGRAM_REDIRECTS=1` in env to enable redirects
- **Redirects** (when enabled):
  - `/discover` → `/programs?status=upcoming`
  - `/archive` → `/programs?status=completed`
  - `/projects/:slug` → `/programs/:slug`
  - `/events/:slug` → `/programs/:slug`
- **Sitemap**: Excludes legacy `/events/*` and `/projects/*` routes
- **Canonical Model**: `Program` is the unified content type replacing Event and Project

## Development Workflow

- **Development Log**: Track changes in `docs/dev-log.md` for session continuity
- **Pre-commit**: Husky runs `biome check --write` via lint-staged on all changed files
- **Type Checking**: Always run `bun run type-check` before pushing
- **Biome Check**: Run `bun run check` to lint and format, or `bun run check:fix` to auto-fix
- **Database Changes**:
  1. Edit `prisma/schema.prisma`
  2. Run `bunx prisma migrate dev -n "descriptive-message"`
  3. Commit both schema and migration files
  4. `bunx prisma generate` runs automatically via postinstall
- **Bun-Specific Commands**: Alternative commands with `--bun` flag available (`dev:bun`, `build:bun`, `start:bun`)

## Key Technical Patterns

- **Server Actions**: Use `'use server'` directive for data mutations in `modules/*/server/actions.ts`
- **Data Fetching**: Server components fetch directly, client components use TanStack Query
- **Form Validation**: Zod schemas in `src/lib/schemas`, integrated with React Hook Form via `@hookform/resolvers`
- **State Management**: Jotai for global client state (e.g., search modal)
- **Styling**: Tailwind CSS with `cn()` utility (clsx + tailwind-merge)
- **UI Components**: Radix UI primitives + shadcn/ui patterns
- **Error Handling**: Server actions return `{ success: boolean, error?: string }` pattern
