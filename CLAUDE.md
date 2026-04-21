# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

- `bun run dev` — Next.js dev server (Turbopack)
- `bun run build` — `prisma generate` + `next build`
- `bun run type-check` — `tsc --noEmit`
- `bun run check` — Biome lint + format combined
- `bun run check:fix` — Auto-fix Biome issues
- Before pushing: `bun run type-check && bun run check`
- Prisma: `bunx prisma migrate dev -n "<msg>"`, `bunx prisma generate`, `bunx prisma studio`
- Pre-commit hook (Husky): `biome check --write --no-errors-on-unmatched` via lint-staged
- **No test framework** — no unit/integration test setup exists yet

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict) + **Bun**
- **PostgreSQL** via **Prisma** ORM (Neon), **Iron Session** (cookie auth, 7-day expiry)
- **Biome v2** for lint/format — line width 80, single quotes (JS), double quotes (JSX), auto-organizes imports
  - Key rules: `noUnusedImports: warn`, `noExplicitAny: warn`, `useImportType: warn`, `noUnusedVariables: warn`, `useExhaustiveDependencies: warn`
- **Tailwind CSS v3** + **shadcn/ui** (Radix) + **CVA**
- **TanStack Query** (client state — `refetchOnFocus: false`, `retry: 3`), **React Hook Form** + **Zod** (validation)
- **TipTap** (rich text), **@dnd-kit** (drag-drop), **react-day-picker** (calendar)
- **Cloudflare Images/Stream** (media hosting), **PortOne V2** (payments)
- **Resend** (email), **Aligo/Solapi** (SMS — provider via `SMS_PROVIDER` env)
- Deployed on **Vercel**

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (home)/             # Homepage
│   ├── (content)/          # Public: programs, journal, drops
│   ├── (page)/             # Static pages + entity views (artists, venues, artworks, forms)
│   ├── (auth)/             # Auth pages (/auth/signin, /auth/signup)
│   ├── admin/              # Admin dashboard (top-level, middleware-protected)
│   └── api/                # API routes
├── modules/<domain>/       # Feature modules
│   ├── server/actions.ts   # Server actions ('use server')
│   └── ui/{views,components,section}/
├── components/ui/          # shadcn/ui primitives
├── hooks/                  # Custom hooks
├── lib/                    # Auth, DB, CDN, payment, schemas, SMS, email, utils
└── middleware.ts            # Route protection
```

**Import paths**: `@/*` → `./src/*`. **Filenames**: kebab-case. **UI language**: Korean.

### Modules

`programs`, `journal`, `artists`, `venues`, `artworks`, `auth`, `forms`, `sms`, `email`, `drops`, `tickets`, `home`, `estimates`, `pnl` — each with `server/actions.ts` + `ui/`. Query provider: `src/modules/providers.tsx`.

## Key Patterns

### Server Actions
- `'use server'` directive, return `{ success, error? }` or `{ success, data? }`
- Admin guard: `requireAdmin()` → `{ success, userId }`
- Auth check: `canManage(sessionId, authorId?)` — ADMIN or resource owner
- **Important**: `'use server'` files cannot export synchronous functions — move utility functions to `@/lib/utils`

### React 19 + Radix UI Compatibility
- Radix Select `name` prop causes infinite re-render inside `<form>` — use controlled state + hidden `<input>` instead
- Inline callback functions in hook deps cause infinite loops — use `useRef` pattern

### Image Upload (Cloudflare)
- Single-use upload URLs — must request new URL on retry
- Variants: `thumbnail`, `public`, `smaller`, `hires` via `getImageUrl(url, variant)`
- `use-single-image-upload` and `use-multi-image-upload` hooks
- `uploadPendingWithProgress()` returns `{ images }` synchronously for payload use (React state is async)
- Max file size: 50MB. Allowed types: JPEG, PNG, GIF, WEBP, HEIC
- HTML body image cleanup: `cleanupRemovedHtmlImages(oldHtml, newHtml)` auto-deletes removed Cloudflare images on content update

### Drops & Payments (PortOne V2)
- Drop types: `ticket` (TicketTier) and `goods` (GoodsVariant)
- Ticket purchase: `createOrder` → PortOne `requestPayment` → `verifyPayment`
- Goods purchase: `createGoodsOrder` → PortOne `requestPayment` → `verifyPayment`
- `verifyPayment` sends order confirmation email on success
- `cancelOrder` restores stock for both ticket tiers and goods variants
- Drop visibility: requires `status !== 'draft'` AND `publishedAt !== null`
- Status change from draft auto-sets `publishedAt`
- Drop statuses: `draft` → `upcoming` → `on_sale` → `sold_out` / `closed`
- **Media**: images and videos unified in `DropMedia` model (`type: image | video`, `order` for DnD sort). No separate `DropImage`/`heroUrl`/`videoUrl` fields — first media by `order` acts as hero. Image `url` = Cloudflare Images URL; video `url` = Cloudflare Stream ID (HLS via `hls.js`).

### Email Templates
- Available templates in `src/lib/email/templates/`: `form-notification`, `newsletter`, `order-confirmation`
- Sent via Resend API through `src/lib/email/send.ts`

### OG Images
- Programs, Journal, Drops all have `opengraph-image.tsx` route handlers
- Noto Sans KR web font loaded for Korean text rendering

## Database

- **Schema**: `prisma/schema.prisma`
- **Key models**: Program, Article, Artist, Venue, Artwork, Form/FormField/FormSubmission, Drop, TicketTier, GoodsVariant, Order/OrderItem, Payment, User
- **Migration caveat**: Dev/prod branches may drift — `prisma db push` or direct ALTER TABLE may be needed
- **Prisma client**: Singleton pattern in `src/lib/db/prisma.ts` (global ref to prevent multiple instances in dev)

### Form Data Safety (Critical)
- **NEVER** physically delete FormField — use soft delete (`archived: true`)
- All field queries filter `where: { archived: false }` except `getFormSubmissions()`

## Auth & Admin

- Iron Session cookie (`prectxe`): `id`, `name`, `isAdmin`
- Public: `/programs/[slug]`, `/drops/[slug]`, `/journal/[slug]`, `/forms/[slug]`, etc.
- Private: `/admin/*`, `/*/new`, `/*/[id]/edit`
- Public-only (redirect to admin if logged in): `/auth/signin`, `/auth/signup`
- Admin dashboard: 10 tabs + Drops/Orders/Revenue stats

## Next.js Config Notes

- **Server external packages**: `aligoapi`, `solapi` (required for SSR)
- **Image remote patterns**: `imagedelivery.net` (Cloudflare), `avatars.githubusercontent.com`, `assets.zyrosite.com`
- **Legacy redirects** (enabled with `ENABLE_PROGRAM_REDIRECTS=1`): `/projects/:slug` → `/programs/:slug`, `/events/:slug` → `/programs/:slug`, `/discover` → `/programs?status=upcoming`, `/archive` → `/programs?status=completed`

## Environment Variables

Required: `DATABASE_URL`, `CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID`, `CLOUDFLARE_IMAGE_STREAM_API_TOKEN`, `COOKIE_PASSWORD` (min 32 chars)

Payment: `PORTONE_API_SECRET`, `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`

Email: `RESEND_API_KEY`, `RESEND_SENDER_EMAIL`, `RESEND_AUDIENCE_ID` (뉴스레터 구독자 리스트 ID). SMS: `SMS_PROVIDER` (`aligo`|`solapi`) + provider-specific keys.

Optional: `ENABLE_PROGRAM_REDIRECTS` (legacy URL redirects)

## Development Workflow

- **Dev log**: `docs/dev-log.md` (recent entries only, archive in `docs/dev-log-archive.md`)
- **Commits**: Concise Korean/English, present tense. Optional scope: `module: message`
- **New features**: Create module → Zod schema → server actions → UI → routes → middleware
- **Pagination default**: `DEFAULT_PAGE_SIZE = 6` (in `src/lib/constants/constants.ts`)
