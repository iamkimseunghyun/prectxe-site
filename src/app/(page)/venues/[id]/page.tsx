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
    d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
  const now = new Date();
  const upcomingPrograms = programs.filter(
    (p) => p.startAt && new Date(p.startAt) > now
  );
  const pastPrograms = programs.filter(
    (p) => !p.startAt || new Date(p.startAt) <= now
  );
  const hasEvents = programs.length > 0 || drops.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
      <VenueSchema
        venue={{
          id: venue.id,
          name: venue.name,
          address: venue.address ?? '',
          images: venue.images,
        }}
      />
      <BreadcrumbNav entityType="venue" title={venue.name} />

      {/* Hero — 사진 + 메타 */}
      <section className="mt-8 grid gap-10 md:mt-12 md:grid-cols-[1.1fr_1fr] md:gap-12 lg:gap-16">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-neutral-100">
          {heroImage ? (
            <Image
              src={getImageUrl(heroImage.imageUrl, 'public')}
              alt={heroImage.alt || venue.name}
              fill
              priority
              sizes="(min-width: 768px) 55vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <MapPin className="h-16 w-16 text-neutral-300" />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
            Venue
          </p>
          <h1 className="mt-4 text-4xl font-light leading-[1.05] tracking-tight text-neutral-900 md:text-5xl lg:text-6xl">
            {venue.name}
          </h1>
          {venue.tagline && (
            <p className="mt-6 text-base leading-relaxed text-neutral-600 md:text-lg">
              {venue.tagline}
            </p>
          )}
          {tags.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="rounded-full bg-neutral-100 font-normal text-neutral-700 hover:bg-neutral-200"
                >
                  {t}
                </Badge>
              ))}
            </div>
          )}
          {(venue.address || location) && (
            <div className="mt-6 space-y-1 text-sm text-neutral-500">
              {venue.address && (
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {venue.address}
                </p>
              )}
              {location && venue.address !== location && (
                <p className="pl-5 text-neutral-400">{location}</p>
              )}
            </div>
          )}
          {hasSocials && (
            <div className="mt-6 flex flex-wrap gap-2">
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

      {/* Events */}
      {hasEvents && (
        <section className="py-20 md:py-28">
          <SectionHeading eyebrow="Events" />

          {upcomingPrograms.length > 0 && (
            <div className="mb-10">
              <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-400">
                Upcoming
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {upcomingPrograms.map((p) => (
                  <Link
                    key={p.id}
                    href={`/programs/${p.slug}`}
                    className="group flex gap-4 rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-900"
                  >
                    {p.heroUrl && (
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        <Image
                          src={getImageUrl(p.heroUrl, 'thumbnail')}
                          alt={p.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                        Program
                      </span>
                      <h4 className="mt-1 line-clamp-2 text-base font-medium leading-snug transition-colors group-hover:text-neutral-500">
                        {p.title}
                      </h4>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatEventDate(p.startAt, p.endAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {drops.length > 0 && (
            <div className="mb-10">
              <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-400">
                Drops
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {drops.map((d) => (
                  <Link
                    key={d.id}
                    href={`/drops/${d.slug}`}
                    className="group flex gap-4 rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-900"
                  >
                    {d.media[0] && (
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        <Image
                          src={getImageUrl(d.media[0].url, 'thumbnail')}
                          alt={d.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                        Drop
                      </span>
                      <h4 className="mt-1 line-clamp-2 text-base font-medium leading-snug transition-colors group-hover:text-neutral-500">
                        {d.title}
                      </h4>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatEventDate(d.eventDate, d.eventEndDate)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {pastPrograms.length > 0 && (
            <div>
              <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-400">
                Past
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {pastPrograms.map((p) => (
                  <Link
                    key={p.id}
                    href={`/programs/${p.slug}`}
                    className="group flex gap-4 rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-900"
                  >
                    {p.heroUrl && (
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                        <Image
                          src={getImageUrl(p.heroUrl, 'thumbnail')}
                          alt={p.title}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                        Program
                      </span>
                      <h4 className="mt-1 line-clamp-2 text-base font-medium leading-snug transition-colors group-hover:text-neutral-500">
                        {p.title}
                      </h4>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatEventDate(p.startAt, p.endAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
