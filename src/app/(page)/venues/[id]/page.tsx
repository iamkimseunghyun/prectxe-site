import { Calendar, ExternalLink, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbNav from '@/components/layout/nav/breadcrum-nav';
import { MediaGallery } from '@/components/media/media-gallery';
import VenueSchema from '@/components/seo/venue-schema';
import { Badge } from '@/components/ui/badge';
import { BUSINESS_INFO } from '@/lib/constants/business-info';
import { getImageUrl } from '@/lib/utils';
import { getVenueById, getVenueEvents } from '@/modules/venues/server/actions';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const venue = await getVenueById(id);

  if (!venue) {
    return { title: 'Venue Not Found' };
  }

  const description =
    venue.tagline ||
    venue.description?.slice(0, 160) ||
    `${venue.name}${venue.city ? ` · ${venue.city}` : ''}`;

  return {
    title: venue.name,
    description,
    alternates: { canonical: `${BUSINESS_INFO.serviceUrl}/venues/${id}` },
    openGraph: {
      title: venue.name,
      description,
      images: venue.images[0]
        ? [{ url: venue.images[0].imageUrl, alt: venue.images[0].alt }]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: venue.name,
      description,
      images: venue.images[0] ? [venue.images[0].imageUrl] : undefined,
    },
  };
}

function formatEventDate(startAt: Date | null, endAt: Date | null) {
  if (!startAt) return null;
  const fmt = (d: Date) =>
    d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  if (!endAt) return fmt(startAt);
  return `${fmt(startAt)} — ${fmt(endAt)}`;
}

function SectionHeading({ eyebrow }: { eyebrow: string }) {
  return (
    <h2 className="mb-8 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-400 md:mb-10">
      {eyebrow}
    </h2>
  );
}

type TimelineItem =
  | {
      kind: 'program';
      id: string;
      slug: string;
      title: string;
      startAt: Date | null;
      endAt: Date | null;
      heroUrl: string | null;
      sortDate: Date | null;
    }
  | {
      kind: 'drop';
      id: string;
      slug: string;
      title: string;
      eventDate: Date | null;
      eventEndDate: Date | null;
      heroUrl: string | null;
      sortDate: Date | null;
    };

function EventCard({ item }: { item: TimelineItem }) {
  const href =
    item.kind === 'program' ? `/programs/${item.slug}` : `/drops/${item.slug}`;
  const dateStr =
    item.kind === 'program'
      ? formatEventDate(item.startAt, item.endAt)
      : formatEventDate(item.eventDate, item.eventEndDate);
  const badgeLabel = item.kind === 'program' ? 'Program' : 'Drop';

  return (
    <Link
      href={href}
      className="group flex gap-4 border-b border-neutral-100 py-5 transition-colors hover:bg-neutral-50"
    >
      {item.heroUrl ? (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-neutral-100 md:h-24 md:w-24">
          <Image
            src={getImageUrl(item.heroUrl, 'thumbnail')}
            alt={item.title}
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
      ) : (
        <div className="h-20 w-20 shrink-0 rounded-md bg-neutral-100 md:h-24 md:w-24" />
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
          {badgeLabel}
        </span>
        <h4 className="mt-1 line-clamp-2 text-base font-medium leading-snug transition-colors group-hover:text-neutral-500 md:text-lg">
          {item.title}
        </h4>
        {dateStr && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-500">
            <Calendar className="h-3.5 w-3.5" />
            {dateStr}
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const venue = await getVenueById(id);
  if (!venue) notFound();

  const { programs, drops } = await getVenueEvents(venue.id, venue.name);

  const location = [venue.city, venue.country].filter(Boolean).join(', ');
  const tags = venue.tags ?? [];
  const socials: [string | null, string][] = [
    [venue.website, 'Website'],
    [venue.instagram, 'Instagram'],
  ];
  const hasSocials = socials.some(([url]) => !!url);
  const hasBio = !!venue.description;
  const hasAdditionalImages = venue.images.length > 1;
  const heroImage = venue.images[0];

  // 프로그램·드롭을 병합 → 연도별 내림차순 그룹화
  const timeline: TimelineItem[] = [
    ...programs.map(
      (p): TimelineItem => ({
        kind: 'program',
        id: p.id,
        slug: p.slug,
        title: p.title,
        startAt: p.startAt,
        endAt: p.endAt,
        heroUrl: p.heroUrl,
        sortDate: p.startAt,
      })
    ),
    ...drops.map(
      (d): TimelineItem => ({
        kind: 'drop',
        id: d.id,
        slug: d.slug,
        title: d.title,
        eventDate: d.eventDate,
        eventEndDate: d.eventEndDate,
        heroUrl: d.media[0]?.url ?? null,
        sortDate: d.eventDate,
      })
    ),
  ].sort((a, b) => {
    const ad = a.sortDate ? new Date(a.sortDate).getTime() : 0;
    const bd = b.sortDate ? new Date(b.sortDate).getTime() : 0;
    return bd - ad;
  });

  const byYear = new Map<string, TimelineItem[]>();
  for (const item of timeline) {
    const year = item.sortDate
      ? String(new Date(item.sortDate).getFullYear())
      : 'Undated';
    const bucket = byYear.get(year) ?? [];
    bucket.push(item);
    byYear.set(year, bucket);
  }
  const yearEntries = Array.from(byYear.entries());
  const hasEvents = timeline.length > 0;

  return (
    <div>
      <VenueSchema
        venue={{
          id: venue.id,
          name: venue.name,
          address: venue.address ?? '',
          images: venue.images,
        }}
      />

      {/* Hero — 가로 파노라마 full-bleed */}
      <section className="relative">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100 md:aspect-[21/9]">
          {heroImage ? (
            <Image
              src={getImageUrl(heroImage.imageUrl, 'hires')}
              alt={heroImage.alt || venue.name}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <MapPin className="h-24 w-24 text-neutral-300" />
            </div>
          )}
          {/* 하단 그라디언트 — 제목 가독성 */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 px-6 pb-10 md:px-10 md:pb-14">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-white/70">
                Venue
              </p>
              <h1 className="mt-3 text-4xl font-light leading-[1.05] tracking-tight text-white md:text-6xl lg:text-7xl">
                {venue.name}
              </h1>
              {venue.tagline && (
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
                  {venue.tagline}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 메타 블록 — hero 바로 아래, 컴팩트 */}
      <section className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-4 px-6 py-6 md:px-10">
          <div className="mx-4 md:mx-0">
            <BreadcrumbNav entityType="venue" title={venue.name} />
          </div>
          {(venue.address || location) && (
            <div className="flex items-start gap-1.5 text-sm text-neutral-600">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
              <div>
                {venue.address && <div>{venue.address}</div>}
                {location && venue.address !== location && (
                  <div className="text-xs text-neutral-400">{location}</div>
                )}
              </div>
            </div>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="rounded-full bg-neutral-100 font-normal text-neutral-700"
                >
                  {t}
                </Badge>
              ))}
            </div>
          )}
          {hasSocials && (
            <div className="ml-auto flex flex-wrap gap-2">
              {socials
                .filter(([url]) => !!url)
                .map(([url, label]) => (
                  <a
                    key={label}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-600 transition-colors hover:border-neutral-900 hover:text-neutral-900"
                  >
                    {label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 md:px-10">
        {/* About */}
        {hasBio && (
          <section className="py-20 md:py-28">
            <div className="mx-auto max-w-3xl">
              <SectionHeading eyebrow="About" />
              <div className="whitespace-pre-line text-base leading-[1.8] text-neutral-700 md:text-lg">
                {venue.description}
              </div>
            </div>
          </section>
        )}

        {/* Events — 연대기 타임라인 */}
        {hasEvents && (
          <section className="py-20 md:py-28">
            <SectionHeading eyebrow="Events" />
            <div className="space-y-14 md:space-y-20">
              {yearEntries.map(([year, items]) => (
                <div
                  key={year}
                  className="grid gap-6 md:grid-cols-[120px_1fr] md:gap-10"
                >
                  <div className="md:sticky md:top-24 md:self-start">
                    <p className="text-2xl font-light tabular-nums text-neutral-900 md:text-3xl">
                      {year}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-neutral-400">
                      {items.length} event{items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="border-t border-neutral-200">
                    {items.map((item) => (
                      <EventCard key={`${item.kind}-${item.id}`} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Gallery */}
        {hasAdditionalImages && (
          <section className="py-20 md:py-28">
            <div className="mb-8 md:mb-10">
              <SectionHeading eyebrow="Gallery" />
            </div>
            <div className="-mx-6 md:-mx-10">
              <MediaGallery
                items={venue.images.map((img) => ({
                  id: img.id,
                  type: 'image',
                  url: img.imageUrl,
                  alt: img.alt,
                }))}
                title={venue.name}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
