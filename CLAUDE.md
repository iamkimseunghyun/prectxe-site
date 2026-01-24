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
  - Available modules: programs, journal, artists, venues, artworks, events, projects, auth, home, about, forms
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
  - Forms: `/forms/[slug]` (public form submission)
  - Admin: `/admin` (dashboard with tabs for programs, journal, artists, venues, artworks, forms)
- **Tests**: Colocate with source in `__tests__/` or as `*.test.ts(x)` (Vitest when configured)

## Build, Test, and Development Commands

- `bun run dev` — Start Next.js (Turbopack) for local dev.
- `bun run build` — Run `prisma generate` then `next build`.
- `bun run start` — Serve the production build.
- `bun run type-check` — TypeScript type checking.
- `bun run lint` — Biome linter (`biome lint .`).
- `bun run format` — Biome formatter (`biome format --write .`).
- `bun run check` — Biome check (lint + format).
- `bun run check:fix` — Auto-fix Biome issues.
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
    - Fields: slug (unique), title, type (exhibition/live/party/workshop/talk), status (draft/upcoming/completed), startAt, endAt, isFeatured
    - Relations: ProgramImage[], ProgramCredit[] (many-to-many with Artist)
    - Free-text fields: venue, organizer (legacy Venue model slated for removal)
  - `Article` - Journal entries with slug, title, body, cover, tags, publishedAt, isFeatured
  - `Artist` - Artist profiles with name (en/kr), biography, images
  - `User` - Authentication with role (ADMIN/USER), manages programs/articles
  - `Form` - Dynamic form builder with slug, title, description, coverImage, status (draft/published/closed)
    - Relations: FormField[] (12 field types: text, email, textarea, select, multiselect, radio, checkbox, date, phone, url, file, number)
    - Tracks submissions via FormSubmission[] and FormResponse[]
    - Response preservation: FormResponse stores field snapshots (fieldLabel, fieldType) to handle field modifications/deletions
- **Featured Content System**:
  - Both `Program` and `Article` have `isFeatured` boolean flag for homepage display
  - Only one content item can be featured at a time (enforced via Prisma transactions)
  - Setting new featured content automatically unfeatures all other content
  - Homepage displays featured content with title and artists (programs) or title only (articles)
  - Admin dashboard shows currently featured content with thumbnail and edit link
- **Legacy Models**: Event, Project, Venue (still in schema but being phased out in favor of Program with free-text venue field)
- **Migrations**: After schema changes, run `bunx prisma migrate dev -n "description"` then `bunx prisma generate`

## Authentication & Authorization

- **Session Management**: Iron Session (`src/lib/auth/session.ts`)
  - Cookie name: `prectxe`
  - Session fields: `id`, `name`, `isAdmin`
  - Password from env: `COOKIE_PASSWORD`
- **Protected Routes**: `/admin/*` requires `isAdmin: true`
- **Auth Flow**: Login/logout actions in `src/modules/auth/server/actions.ts`
- **Middleware** (`src/middleware.ts`): Route protection logic
  - Public routes: Static pages + public dynamic patterns
  - Private routes: `/admin/*` + edit pages (requires login)
  - Public-only routes: `/auth/signin`, `/auth/signup` (redirect if logged in)
- **Role-Based Access Control (RBAC)**:
  - Server actions accept `isAdmin` parameter (default: false)
  - Admins can manage all resources; regular users limited to own resources
  - Pattern: `if (!isAdmin && resource.userId !== userId) return { success: false, error: '...' }`
  - Apply to: list, get, update, delete operations in server actions

## Image Upload Architecture

- **Provider**: Cloudflare Images API
- **Upload Flow** (`src/lib/cdn/cloudflare.ts`):
  1. Server generates one-shot upload URL via `getCloudflareImageUrl()`
  2. Client uploads directly to Cloudflare using fetch with FormData
  3. Server finalizes by extracting image ID from response
  4. Forms implement auto-retry with new URL on failure
  5. Gallery uploads show per-item progress with retry buttons
- **Image URLs**: `https://imagedelivery.net/<account-hash>/<image-id>/public`
- **Important**: Upload URLs are single-use; forms must request new URL on retry
- **Implementation Pattern**:
  ```typescript
  // 1. Get upload URL from server action
  const uploadURL = await getCloudflareImageUrl();

  // 2. Check if file exists and upload
  if (imageFile) {
    const uploadSuccess = await uploadImage(imageFile, uploadURL);
    if (!uploadSuccess) {
      toast({ title: 'Upload failed', variant: 'destructive' });
      return; // Abort form submission
    }
    // 3. Finalize to extract image ID
    const imageId = await finalizeUpload();
  }

  // 4. Submit form with image ID
  const result = await createResource({ ...data, image: imageId });
  ```
- **Multi-Image Uploads**: Track per-image state (uploading/success/error) with individual retry buttons

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
- **Homepage**: Full-screen hero (`min-h-screen`) with inline navigation links
- **Back Button Pattern**: Shared component (`src/components/shared/back-button.tsx`) used across detail pages with sticky positioning for scroll persistence
- **Removed**: Traditional nav bar, `--header-height` CSS variable (migration to Biome), GlobalSearch (removed 2026-01-06)

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
- **Forms Management**: `/admin/forms`
  - Dynamic form builder with drag-and-drop field ordering
  - 12 field types with validation rules (text, email, textarea, select, multiselect, radio, checkbox, date, phone, url, file, number)
  - Cover image upload for forms
  - Public form rendering at `/forms/[slug]`
  - Submission tracking and management
  - Form status: draft, published, closed
- **Other Admin Pages**: `/admin/artists`, `/admin/venues`, `/admin/artworks`
- **Form Design**: Card-based sections (basic info, content, images, metadata) with required field indicators (`*`)

## Dynamic Form Builder Architecture

- **Form Models**: `Form` (metadata), `FormField` (field definitions), `FormSubmission` (user submissions), `FormResponse` (field values)
- **Field Types**: 12 types - text, email, textarea, select, multiselect, radio, checkbox, date, phone, url, file, number
- **Field Management**:
  - Drag-and-drop reordering with automatic `order` updates
  - Temporary IDs for React key management during editing
  - Validation rules (required, min/max length, patterns)
- **Response Preservation**:
  - FormResponse stores snapshots: `fieldLabel`, `fieldType` (nullable references to FormField)
  - Preserves data even when fields are modified or deleted
  - Allows form evolution without losing historical submission data
- **Preview System**: Renders actual form components (disabled) for accurate preview
- **Image Upload Pattern**:
  - Check `imageFile` existence before calling `uploadImage()`
  - Verify upload success before calling `finalizeUpload()`
  - Abort submission on upload failure with toast notification
- **Edit Flow**: Load form by ID → verify ownership/admin → reuse FormBuilderView → redirect on completion

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
  - Document date, feature/fix purpose, background context, implementation details
  - Include code snippets for complex patterns and decisions
  - Reference file paths and functions for future reference
  - Update after completing significant features or bug fixes
- **Test Accounts**: Test account credentials and admin access procedures documented in `docs/test-accounts.md`
- **Pre-commit**: Husky runs `biome check --write` via lint-staged on all changed files
- **Type Checking**: Always run `bun run type-check` before pushing
- **Biome Check**: Run `bun run check` to lint and format, or `bun run check:fix` to auto-fix
- **Database Changes**:
  1. Edit `prisma/schema.prisma`
  2. Run `bunx prisma migrate dev -n "descriptive-message"`
  3. Commit both schema and migration files
  4. `bunx prisma generate` runs automatically via postinstall
  5. Update server actions and types to reflect schema changes
  6. Test migrations in development before deploying
- **Bun-Specific Commands**: Alternative commands with `--bun` flag available (`dev:bun`, `build:bun`, `start:bun`)
- **Adding New Features**:
  1. Create module in `src/modules/<domain>/` with `server/` and `ui/` subdirectories
  2. Define Zod schemas in `src/lib/schemas/`
  3. Create server actions in `modules/<domain>/server/actions.ts`
  4. Build UI components in `modules/<domain>/ui/`
  5. Add routes in `src/app/` following route group conventions
  6. Update middleware if auth/permissions needed

## Key Technical Patterns

- **Server Actions**: Use `'use server'` directive for data mutations in `modules/*/server/actions.ts`
  - Export async functions that handle form submissions, data mutations, and business logic
  - Always return `{ success: boolean, error?: string }` or `{ success: boolean, data?: T }`
  - Use `revalidatePath()` or `redirect()` after mutations to update UI
  - RBAC pattern: Accept `isAdmin` parameter (default: false) for admin-only operations
  - Example: `createProgram()`, `updateArticle()`, `deleteForm(formId, userId, isAdmin)`
- **Data Fetching**: Server components fetch directly, client components use TanStack Query
  - Server Components: Direct Prisma queries or call server functions
  - Caching: `unstable_cache` from `next/cache` for server-side data
  - Client Components: TanStack Query with 60s stale time default
  - Query keys: Use consistent patterns like `['programs', status]` or `['article', slug]`
- **Form Validation**: Zod schemas in `src/lib/schemas`, integrated with React Hook Form via `@hookform/resolvers`
  - Define schemas with `.refine()` for custom validation
  - Use `zodResolver(schema)` in `useForm()` hook
  - Server-side validation: Re-validate with same schema in server actions
- **State Management**:
  - Global Client State: Jotai atoms (minimal usage, e.g., modal open state)
  - Form State: React Hook Form
  - Server State: TanStack Query (caching, refetching, optimistic updates)
- **Styling**: Tailwind CSS with `cn()` utility (clsx + tailwind-merge)
  - Use `cn()` to conditionally merge Tailwind classes
  - Component variants: class-variance-authority (CVA) for complex components
- **UI Components**: Radix UI primitives + shadcn/ui patterns
  - Located in `src/components/ui/`
  - Unstyled primitives styled with Tailwind
  - Composed into higher-level components in `src/components/shared/`
- **Error Handling**:
  - Server actions return `{ success: boolean, error?: string }` pattern
  - Client components show toast notifications on errors
  - Use `try-catch` in server actions with proper error messages
