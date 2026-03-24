# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build, Test, and Development Commands

- `bun run dev` — Start Next.js dev server (Turbopack)
- `bun run build` — Run `prisma generate` then `next build`
- `bun run type-check` — TypeScript type checking (`tsc --noEmit`)
- `bun run lint` — Biome linter (`biome lint .`)
- `bun run lint:fix` — Auto-fix lint issues (`biome lint --write .`)
- `bun run check` — Biome check (lint + format combined)
- `bun run check:fix` — Auto-fix Biome issues
- `bun run format` — Biome formatter (`biome format --write .`)
- Prisma: `bunx prisma migrate dev -n "<msg>"`, `bunx prisma generate`, `bunx prisma studio`
- Before pushing: `bun run type-check && bun run check`
- Pre-commit hook (Husky): runs `biome check --write --no-errors-on-unmatched` via lint-staged on all changed files
- `postinstall` runs `prisma generate` locally but skips in CI (`$CI` check)

## Tech Stack

- **Next.js 16** (App Router) with **React 19**, **TypeScript** (strict)
- **Bun** as package manager and runtime
- **PostgreSQL** via **Prisma** ORM (hosted on Neon)
- **Biome v2** (2.3.x) for linting/formatting (replaced ESLint + Prettier) — key rules: `noUnusedImports: warn`, `noExplicitAny: warn`, `noNonNullAssertion: off`, `useImportType: warn`, `useExhaustiveDependencies: warn`, `noArrayIndexKey: warn`, `useKeyWithClickEvents: warn`, `noSvgWithoutTitle: off`, auto-organizes imports
- **Tailwind CSS v3** + **shadcn/ui** (Radix UI primitives) + **CVA** for component variants
- **TanStack Query** for client-side server state, **React Hook Form** + **Zod** for form validation
- **TipTap** for rich text editing (journal articles, email content)
- **@dnd-kit** for drag-and-drop (form field ordering), **embla-carousel-react** for carousels, **xlsx** for spreadsheet export
- **Iron Session** for cookie-based auth
- **Cloudflare Images** for image hosting (Next.js `images.unoptimized: true` — Cloudflare handles optimization)
- **Aligo/Solapi** for Korean SMS delivery, **Resend** for email
- SMS packages (`aligoapi`, `solapi`) are `serverExternalPackages` in `next.config.ts` (Node.js-only)
- Deployed on **Vercel** with `@vercel/analytics` and `@vercel/speed-insights`

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (home)/                   # Homepage
│   ├── (content)/                # Public content (programs, journal, drops)
│   ├── (page)/                   # Static pages + public entity views (artists, venues, artworks, forms)
│   ├── (auth)/                   # Auth pages + admin routes (/admin/*)
│   ├── (marketing)/              # Marketing pages
│   └── api/                      # API routes (slug validation, admin deletion)
├── modules/<domain>/             # Feature modules (see below)
│   ├── server/actions.ts         # Server actions ('use server')
│   └── ui/{views,components,section}/
├── modules/providers.tsx         # TanStack Query provider (QueryClient singleton)
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── admin/                    # Admin-specific (AdminNav, AdminHeader, AdminPagination)
│   ├── shared/                   # Reusable components (back-button, etc.)
│   ├── layout/                   # Header, footer, navigation
│   ├── email-editor/             # TipTap-based rich text editor
│   └── image/                    # Image optimization components
├── hooks/                        # use-session, use-single-image-upload, use-multi-image-upload, use-infinite-scroll, use-toast
├── lib/
│   ├── auth/                     # session.ts (Iron Session), require-admin.ts, make-login.ts
│   ├── cdn/cloudflare.ts         # Image upload/delete utilities
│   ├── db/prisma.ts              # Prisma client instance
│   ├── payment/portone.ts        # PortOne V2 SDK client instance
│   ├── schemas/                  # Zod schemas (program, article, artist, artwork, venue, form, auth, seo, base, types)
│   ├── sms/                      # SMS provider abstraction (aligo.ts, solapi.ts, provider.ts)
│   ├── email/                    # Email templates and utilities
│   └── utils.ts                  # cn(), formatDate(), getImageUrl(), uploadImage(), slugify(), formatArtistName()
└── middleware.ts                 # Route protection
```

**Import paths**: Use `@/*` alias (e.g., `@/lib/utils`, `@/components/ui/button`)

### Modules

Full modules (with server actions + UI): `programs`, `journal`, `artists`, `venues`, `artworks`, `auth`, `forms`, `sms`, `email`, `drops`, `tickets`
UI-only: `home` (section components only, no server actions)

Each full module follows the pattern:
- `server/actions.ts` — Server actions with `'use server'` directive
- `ui/views/` — Page-level view components
- `ui/components/` — Reusable module-specific components
- `ui/section/` — Page sections

## Coding Style

- TypeScript strict mode. 2-space indent, single quotes, semicolons always, print width 80, trailing commas (es5)
- Biome auto-organizes imports on check/format — don't manually sort imports
- Filenames: kebab-case (e.g., `program-card.tsx`). Components/hooks in PascalCase
- Use `cn()` from `@/lib/utils` to merge Tailwind classes (clsx + tailwind-merge)
- Korean-language UI strings and error messages throughout the codebase
- `slugify()` returns `null` for Korean text — users must input slugs manually

## Key Technical Patterns

### Server Actions
- Located in `modules/<domain>/server/actions.ts` with `'use server'` directive
- Return `{ success: boolean, error?: string }` or `{ success: boolean, data?: T }`
- Use `revalidatePath()` or `redirect()` after mutations
- RBAC: Accept `isAdmin` parameter (default: false). Admins manage all resources; regular users limited to own
- Admin guard: `requireAdmin()` from `@/lib/auth/require-admin.ts` validates session and role, returns `{ success, userId }` or `{ success: false, error }`
- Pagination: All paged actions return `{ page, pageSize, total, items }`

### API Routes
- Slug validation: `GET /api/programs/check-slug?slug=x` and `/api/journal/check-slug?slug=x` — used by forms for real-time uniqueness checks
- Admin deletion: `DELETE /api/admin/{entity}/[id]` — separate from server actions because delete confirmations use client-side fetch
- Program listing: `GET /api/programs/list` — public API for program data
- Session: `GET /api/auth/session` — returns current session for client components

### Data Fetching
- Server Components: Direct Prisma queries or server functions
- Client Components: TanStack Query with 60s stale time default (configured in `src/modules/providers.tsx`)
- Query keys: Consistent patterns like `['programs', status]` or `['article', slug]`

### Form Validation
- Zod schemas in `src/lib/schemas/`, integrated with React Hook Form via `zodResolver(schema)`
- Server-side: Re-validate with same Zod schema in server actions

### Image Upload (Cloudflare Images)
- Single-use upload URLs from `getCloudflareImageUrl()` — must request new URL on retry
- Client uploads directly to Cloudflare, then server extracts image ID via `finalizeUpload()`
- Image URL variants: `thumbnail`, `public`, `smaller`, `hires` via `getImageUrl(url, variant)`
- Hooks: `use-single-image-upload` and `use-multi-image-upload` for UI state management
- Deletion utilities: `deleteRemovedImages()` and `deleteAllImages()` in `src/lib/cdn/cloudflare.ts`

### Dynamic OG Images
- Programs and journal articles have `opengraph-image.tsx` route handlers that generate OG images at build/request time
- Located at `src/app/(content)/programs/[slug]/opengraph-image.tsx` and `src/app/(content)/journal/[slug]/opengraph-image.tsx`

## Database & Data Model

- **Schema**: `prisma/schema.prisma`
- **Key Models**:
  - `Program` — slug (unique), type (exhibition/live/party/workshop/talk), status (draft/upcoming/completed), isFeatured, venue/organizer (free-text), ProgramImage[], ProgramCredit[] (many-to-many with Artist)
  - `Article` — Journal entries with slug, body, cover, tags, publishedAt, isFeatured
  - `Artist` — Bilingual names: `name` (mapped to `name_en` column) and `nameKr` (mapped to `name_kr` column), biography, ArtistImage[]
  - `Venue` — Standalone venue management with VenueImage[]
  - `Artwork` — Multi-artist relation via ArtistArtwork junction, ArtworkImage[]
  - `Form/FormField/FormSubmission/FormResponse` — Dynamic form builder (12 field types), FormField has `archived` flag for soft delete
  - `Drop` — Container for ticket/goods sales. slug (unique), type (ticket/goods), status (draft/upcoming/on_sale/sold_out/closed), heroUrl, videoUrl, DropImage[]
  - `TicketTier` — Ticket tiers linked to Drop via `dropId?`. name, price, quantity, soldCount, maxPerOrder, status (scheduled/on_sale/sold_out/closed)
  - `GoodsVariant` — Goods options linked to Drop via `dropId`. name, price, stock, soldCount, options (JSON)
  - `Order` — Purchase orders linked to Drop via `dropId?`. orderNo (unique), buyer info, totalAmount, status (pending/paid/confirmed/cancelled/refunded)
  - `OrderItem` — Polymorphic: links to `ticketTierId?` or `goodsVariantId?`
  - `Payment` — PortOne payment records linked to Order. portonePaymentId (unique)
  - `SMSCampaign/SMSRecipient` — Bulk SMS tracking with personalized name/value per recipient
  - `EmailCampaign/EmailRecipient` — Email campaign tracking
  - `User` — Role-based (ADMIN/USER)
- **Featured Content**: Only one Program or Article can be `isFeatured` at a time (enforced via Prisma transaction that unfeatures all before featuring one)
- **Migrations**: Edit schema → `bunx prisma migrate dev -n "description"` → commit both schema and migration files
- **Migration caveat**: If migration history drifts between dev/prod branches, `prisma db push` or direct `ALTER TABLE` may be needed instead of `migrate dev`

### Form Data Safety (Critical)
- **NEVER** physically delete FormField records — use soft delete (`archived: true`) to preserve `fieldId` relationships
- FormField has `archived Boolean @default(false)` — all field queries must filter `where: { archived: false }` except `getFormSubmissions()` (needs all fields for history)
- FormResponse stores field snapshots (`fieldLabel`, `fieldType`) as backup, but primary data integrity relies on `fieldId` foreign key
- When "deleting" fields in `updateForm()`: Set `archived: true` via `updateMany`, never `deleteMany`
- Legacy data: Some old responses may have `fieldId: null` from before soft delete — submissions view handles both patterns
- Empty submission prevention: 3-layer (reject empty data, use transactions, verify response count)

## Authentication & Authorization

- **Iron Session** cookie (`prectxe`): fields `id`, `name`, `isAdmin`
- **Middleware** (`src/middleware.ts`):
  - Public-only: `/auth/signin`, `/auth/signup` (redirect to `/admin` if logged in)
  - Public: static pages + detail views (`/programs/[slug]`, `/artists/[id]`, `/forms/[slug]`, etc.)
  - Private: `/admin/*`, `/*/new`, `/*/[id]/edit` (redirect to `/` if not logged in)
- **Auth actions**: `src/modules/auth/server/actions.ts`

## Admin Interface

- Dashboard: `/admin` — Tab-based navigation (ADMIN role only)
- Content: `/admin/programs`, `/admin/journal` (CRUD with image uploads)
- Entities: `/admin/artists`, `/admin/venues`, `/admin/artworks`
- Drops: `/admin/drops` — 티켓/굿즈 통합 판매 관리. Drop 생성/편집(`/admin/drops/[id]/edit`), 티켓 등급 관리, 굿즈 옵션(GoodsVariant) CRUD, 주문 목록. Public: `/drops`, `/drops/[slug]` (타입별 두 가지 레이아웃). 결제: PortOne V2 연동 (티켓/굿즈 모두). 결제 완료 시 주문 확인 이메일 자동 발송.
- Forms: `/admin/forms` — Dynamic form builder with 12 field types, drag-and-drop ordering, public rendering at `/forms/[slug]`
- SMS: `/admin/sms` — Bulk SMS to form respondents (multi-provider: Aligo/Solapi)
- Email: `/admin/email` — Email campaigns via Resend

## Environment Variables

Required (never commit `.env*`):
- `DATABASE_URL` — PostgreSQL connection string
- `CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID`, `CLOUDFLARE_IMAGE_STREAM_API_TOKEN`
- `COOKIE_PASSWORD` — Iron Session encryption key (min 32 chars)

Optional:
- `ENABLE_PROGRAM_REDIRECTS=1` — Enable legacy route redirects (`/discover` → `/programs?status=upcoming`, `/archive` → `/programs?status=completed`, `/projects/:slug` and `/events/:slug` → `/programs/:slug`)
- SMS (Aligo): `ALIGO_API_KEY`, `ALIGO_USER_ID`, `ALIGO_SENDER_PHONE`, `ALIGO_TEST_MODE` (set `Y` for dev — no IP restriction, no actual sending)
- SMS (Solapi): `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_PHONE`
- `SMS_PROVIDER` — `aligo` (default, requires fixed IP) or `solapi` (no IP restriction, works on Vercel)
- Email: `RESEND_API_KEY` — for email campaigns via Resend
- Payment (PortOne V2): `PORTONE_API_SECRET` (server), `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY` (client)

## Development Workflow

- **Dev log**: Track changes in `docs/dev-log.md` for session continuity
- **Commits**: Concise, present tense. Optional scope: `module: message` (e.g., `programs: fix date parsing`)
- **Adding new features**:
  1. Create module in `src/modules/<domain>/` with `server/` and `ui/` subdirectories
  2. Define Zod schemas in `src/lib/schemas/`
  3. Create server actions in `modules/<domain>/server/actions.ts`
  4. Build UI components in `modules/<domain>/ui/`
  5. Add routes in `src/app/` following route group conventions
  6. Update middleware if auth/permissions needed
- **Database changes**: Edit `prisma/schema.prisma` → `bunx prisma migrate dev -n "msg"` → commit schema + migration → `bunx prisma generate` runs via postinstall

## UI Patterns

- **No traditional header/navbar**: Navigation is minimal and contextual
- **Admin header**: Floating pill button (top-right, `fixed right-4 top-4`), visible only to logged-in admins
- **Homepage**: Full-screen hero (`min-h-screen`) with inline navigation links
- **Back button**: Shared sticky component (`src/components/shared/back-button.tsx`) on detail pages
