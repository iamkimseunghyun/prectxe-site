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

## Tech Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict) + **Bun**
- **PostgreSQL** via **Prisma** ORM (Neon), **Iron Session** (cookie auth)
- **Biome v2** for lint/format — auto-organizes imports, key rules: `noUnusedImports: warn`, `noExplicitAny: warn`, `useImportType: warn`
- **Tailwind CSS v3** + **shadcn/ui** (Radix) + **CVA**
- **TanStack Query** (client state), **React Hook Form** + **Zod** (validation)
- **TipTap** (rich text), **@dnd-kit** (drag-drop), **react-day-picker** (calendar)
- **Cloudflare Images/Stream** (media hosting), **PortOne V2** (payments)
- **Resend** (email), **Aligo/Solapi** (SMS)
- Deployed on **Vercel**

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (home)/             # Homepage
│   ├── (content)/          # Public: programs, journal, drops
│   ├── (page)/             # Static pages + entity views (artists, venues, artworks, forms)
│   ├── (auth)/             # Auth + admin routes (/admin/*)
│   └── api/                # API routes
├── modules/<domain>/       # Feature modules
│   ├── server/actions.ts   # Server actions ('use server')
│   └── ui/{views,components,section}/
├── components/ui/          # shadcn/ui primitives
├── hooks/                  # Custom hooks
├── lib/                    # Auth, DB, CDN, payment, schemas, SMS, email, utils
└── middleware.ts            # Route protection
```

**Import paths**: `@/*` alias. **Filenames**: kebab-case. **UI language**: Korean.

### Modules

`programs`, `journal`, `artists`, `venues`, `artworks`, `auth`, `forms`, `sms`, `email`, `drops`, `tickets` — each with `server/actions.ts` + `ui/`

## Key Patterns

### Server Actions
- `'use server'` directive, return `{ success, error? }` or `{ success, data? }`
- Admin guard: `requireAdmin()` → `{ success, userId }`
- **Important**: `'use server'` files cannot export synchronous functions — move utility functions to `@/lib/utils`

### React 19 + Radix UI Compatibility
- Radix Select `name` prop causes infinite re-render inside `<form>` — use controlled state + hidden `<input>` instead
- Inline callback functions in hook deps cause infinite loops — use `useRef` pattern

### Image Upload (Cloudflare)
- Single-use upload URLs — must request new URL on retry
- Variants: `thumbnail`, `public`, `smaller`, `hires` via `getImageUrl(url, variant)`
- `use-single-image-upload` and `use-multi-image-upload` hooks
- `uploadPendingWithProgress()` returns `{ images }` synchronously for payload use (React state is async)

### Drops & Payments (PortOne V2)
- Drop types: `ticket` (TicketTier) and `goods` (GoodsVariant)
- Ticket purchase: `createOrder` → PortOne `requestPayment` → `verifyPayment`
- Goods purchase: `createGoodsOrder` → PortOne `requestPayment` → `verifyPayment`
- `verifyPayment` sends order confirmation email on success
- `cancelOrder` restores stock for both ticket tiers and goods variants
- Drop visibility: requires `status !== 'draft'` AND `publishedAt !== null`
- Status change from draft auto-sets `publishedAt`

### OG Images
- Programs, Journal, Drops all have `opengraph-image.tsx` route handlers
- Noto Sans KR web font loaded for Korean text rendering

## Database

- **Schema**: `prisma/schema.prisma`
- **Key models**: Program, Article, Artist, Venue, Artwork, Form/FormField/FormSubmission, Drop, TicketTier, GoodsVariant, Order/OrderItem, Payment, User
- **Migration caveat**: Dev/prod branches may drift — `prisma db push` or direct ALTER TABLE may be needed

### Form Data Safety (Critical)
- **NEVER** physically delete FormField — use soft delete (`archived: true`)
- All field queries filter `where: { archived: false }` except `getFormSubmissions()`

## Auth & Admin

- Iron Session cookie (`prectxe`): `id`, `name`, `isAdmin`
- Public: `/programs/[slug]`, `/drops/[slug]`, `/journal/[slug]`, `/forms/[slug]`, etc.
- Private: `/admin/*`, `/*/new`, `/*/[id]/edit`
- Admin dashboard: 10 tabs + Drops/Orders/Revenue stats

## Environment Variables

Required: `DATABASE_URL`, `CLOUDFLARE_IMAGE_STREAM_API_ACCOUNT_ID`, `CLOUDFLARE_IMAGE_STREAM_API_TOKEN`, `COOKIE_PASSWORD`

Payment: `PORTONE_API_SECRET`, `NEXT_PUBLIC_PORTONE_STORE_ID`, `NEXT_PUBLIC_PORTONE_CHANNEL_KEY`

Email: `RESEND_API_KEY`. SMS: `SMS_PROVIDER` (`aligo`|`solapi`) + provider-specific keys.

## Development Workflow

- **Dev log**: `docs/dev-log.md` (recent entries only, archive in `docs/dev-log-archive.md`)
- **Commits**: Concise Korean/English, present tense. Optional scope: `module: message`
- **New features**: Create module → Zod schema → server actions → UI → routes → middleware
