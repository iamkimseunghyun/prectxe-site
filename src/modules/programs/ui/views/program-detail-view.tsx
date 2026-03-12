import { Calendar, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import ProgramSchema from '@/components/seo/program-schema';
import { BackButton } from '@/components/shared/back-button';
import { CopyUrlButton } from '@/components/shared/copy-url-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  artistInitials,
  formatArtistName,
  formatEventDate,
  getImageUrl,
} from '@/lib/utils';
import { listArticlesByProgram } from '@/modules/journal/server/actions';
import { getProgramBySlug } from '@/modules/programs/server/actions';
import ProgramGallery from '@/modules/programs/ui/section/program-gallery';
import { getAvailableTicketTiers } from '@/modules/tickets/server/actions';
import { TicketPurchaseSection } from '@/modules/tickets/ui/components/ticket-purchase-section';

const TYPE_LABELS: Record<string, string> = {
  exhibition: 'EXHIBITION',
  live: 'LIVE',
  party: 'PARTY',
  workshop: 'WORKSHOP',
  talk: 'TALK',
};

export async function ProgramDetailView({ slug }: { slug: string }) {
  const program = await getProgramBySlug(slug);

  if (!program) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Program not found.
      </div>
    );
  }

  const start = program.startAt ? new Date(program.startAt) : null;
  const end = program.endAt ? new Date(program.endAt) : (start ?? undefined);
  const typeLabel = TYPE_LABELS[program.type] || program.type.toUpperCase();

  return (
    <article className="relative">
      <ProgramSchema
        program={{
          title: program.title,
          summary: program.summary,
          description: program.description ?? undefined,
          status: program.status as any,
          type: program.type as any,
          startAt: program.startAt ?? null,
          endAt: program.endAt ?? null,
          city: program.city ?? null,
          venue: program.venue ?? null,
          heroUrl: program.heroUrl ?? null,
          slug: program.slug,
        }}
      />

      {/* ── Hero Section ── */}
      <section className="relative">
        <BackButton className="absolute left-4 top-4 z-20" />
        {program.heroUrl ? (
          <div className="relative h-[50vh] w-full sm:h-[60vh] md:h-[70vh]">
            <Image
              src={getImageUrl(program.heroUrl, 'hires')}
              alt={program.title}
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 px-6 pb-10 sm:px-10 md:px-16 lg:px-24">
              <HeroContent
                typeLabel={typeLabel}
                title={program.title}
                summary={program.summary}
                start={start}
                end={end}
                city={program.city}
                venue={program.venue}
                light
              />
            </div>
          </div>
        ) : (
          <div className="bg-neutral-950 px-6 pb-12 pt-24 sm:px-10 md:px-16 lg:px-24">
            <HeroContent
              typeLabel={typeLabel}
              title={program.title}
              summary={program.summary}
              start={start}
              end={end}
              city={program.city}
              venue={program.venue}
              light
            />
          </div>
        )}
      </section>

      {/* ── Main Content ── */}
      <div className="mx-auto max-w-4xl px-6 sm:px-10">
        {/* Share Bar */}
        <div className="flex items-center justify-end border-b py-4">
          <CopyUrlButton className="inline-flex items-center gap-1.5 text-xs text-neutral-400 transition-colors hover:text-neutral-700" />
        </div>

        {/* Description */}
        {program.description && (
          <section className="py-12">
            <p className="whitespace-pre-line text-base leading-[1.8] text-neutral-700 sm:text-lg">
              {program.description}
            </p>
          </section>
        )}

        {/* Artists / Credits */}
        {program.credits?.length ? (
          <section className="border-t py-12">
            <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Artists
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {program.credits.map((c) => {
                const kr = c.artist?.nameKr || null;
                const en = c.artist?.name || null;
                const name = formatArtistName(kr, en);
                const img = c.artist?.mainImageUrl || undefined;
                const initials = artistInitials(
                  en || undefined,
                  kr || undefined
                );
                return (
                  <Link
                    key={`${c.programId}-${c.artistId}`}
                    href={`/artists/${c.artistId}`}
                    className="group flex items-center gap-3 rounded-lg border border-transparent p-3 transition-all hover:border-neutral-200 hover:bg-neutral-50"
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-neutral-100">
                      {img ? (
                        <AvatarImage
                          src={getImageUrl(img, 'thumbnail')}
                          alt={name}
                        />
                      ) : (
                        <AvatarFallback className="bg-neutral-100 text-sm text-neutral-500">
                          {initials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-900 group-hover:text-neutral-700">
                        {name}
                      </p>
                      {c.role && (
                        <p className="truncate text-xs text-neutral-400">
                          {c.role}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Gallery */}
        {program.images?.length ? (
          <section className="border-t py-12">
            <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Gallery
            </h2>
            <ProgramGallery
              images={program.images.map((i) => ({
                id: i.id,
                imageUrl: i.imageUrl,
                alt: i.alt,
              }))}
            />
          </section>
        ) : null}

        {/* Tickets */}
        {program.ticketingEnabled && (
          <TicketSection programId={program.id} programTitle={program.title} />
        )}

        {/* Related Articles */}
        <RelatedArticles programId={program.id} />

        {/* Footer Nav */}
        <footer className="border-t py-10">
          <nav className="flex items-center justify-center gap-6 text-sm">
            <Link
              href="/"
              className="text-neutral-400 transition-colors hover:text-neutral-900"
            >
              Home
            </Link>
            <Link
              href="/programs"
              className="text-neutral-400 transition-colors hover:text-neutral-900"
            >
              Archive
            </Link>
            <Link
              href="/journal"
              className="text-neutral-400 transition-colors hover:text-neutral-900"
            >
              Journal
            </Link>
            <Link
              href="/about"
              className="text-neutral-400 transition-colors hover:text-neutral-900"
            >
              About
            </Link>
          </nav>
        </footer>
      </div>
    </article>
  );
}

function HeroContent({
  typeLabel,
  title,
  summary,
  start,
  end,
  city,
  venue,
  light,
}: {
  typeLabel: string;
  title: string;
  summary: string | null;
  start: Date | null;
  end: Date | undefined;
  city: string | null;
  venue: string | null;
  light?: boolean;
}) {
  const textColor = light ? 'text-white' : 'text-neutral-900';
  const mutedColor = light ? 'text-white/70' : 'text-neutral-500';

  return (
    <div className="max-w-3xl">
      <span
        className={`inline-block text-xs font-semibold tracking-[0.25em] ${light ? 'text-white/60' : 'text-neutral-400'}`}
      >
        {typeLabel}
      </span>
      <h1
        className={`mt-3 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl ${textColor}`}
      >
        {title}
      </h1>
      {summary && (
        <p className={`mt-4 text-base sm:text-lg ${mutedColor}`}>{summary}</p>
      )}
      <div
        className={`mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm ${mutedColor}`}
      >
        {start && end && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {formatEventDate(start, end)}
          </span>
        )}
        {(city || venue) && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {[city, venue].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>
    </div>
  );
}

async function TicketSection({
  programId,
  programTitle,
}: {
  programId: string;
  programTitle: string;
}) {
  const tiers = await getAvailableTicketTiers(programId);
  if (tiers.length === 0) return null;

  return (
    <section className="border-t py-12">
      <TicketPurchaseSection
        programId={programId}
        programTitle={programTitle}
        tiers={tiers}
      />
    </section>
  );
}

async function RelatedArticles({ programId }: { programId: string }) {
  const articles = await listArticlesByProgram(programId);
  if (!articles.length) return null;

  return (
    <section className="border-t py-12">
      <h2 className="mb-6 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
        Related
      </h2>
      <ul className="space-y-3">
        {articles.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/journal/${a.slug}`}
              className="group flex items-center justify-between rounded-lg p-3 transition-colors hover:bg-neutral-50"
            >
              <span className="text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
                {a.title}
              </span>
              {a.publishedAt && (
                <span className="ml-4 shrink-0 text-xs text-neutral-400">
                  {new Date(a.publishedAt).toLocaleDateString('ko-KR')}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
