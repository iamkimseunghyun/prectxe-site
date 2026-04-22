import {
  Calendar,
  ChevronRight,
  ExternalLink,
  MapPin,
  User,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbNav from '@/components/layout/nav/breadcrum-nav';
import ArtistSchema from '@/components/seo/artist-schema';
import { Badge } from '@/components/ui/badge';
import { BUSINESS_INFO } from '@/lib/constants/business-info';
import { prisma } from '@/lib/db/prisma';
import { formatArtistName, getImageUrl } from '@/lib/utils';
import { getArtistById } from '@/modules/artists/server/actions';
import type { ArtistProgramCredit } from '@/modules/artists/server/types';
import { ArtistCv } from '@/modules/artists/ui/section/artist-cv';
import { ArtistGallery } from '@/modules/artists/ui/section/artist-gallery';
import ArtworkListSection from '@/modules/artworks/ui/section/artwork-list-section';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artist = await prisma.artist.findUnique({
    where: { id },
    select: {
      name: true,
      nameKr: true,
      biography: true,
      tagline: true,
      mainImageUrl: true,
      city: true,
      country: true,
    },
  });

  if (!artist) {
    return { title: 'Artist Not Found' };
  }

  const title = artist.nameKr
    ? `${artist.nameKr} (${artist.name})`
    : artist.name;
  const description =
    artist.tagline ||
    artist.biography?.slice(0, 160) ||
    `${title} - ${[artist.city, artist.country].filter(Boolean).join(', ')}`;

  return {
    title,
    description,
    alternates: { canonical: `${BUSINESS_INFO.serviceUrl}/artists/${id}` },
    openGraph: {
      title,
      description,
      images: artist.mainImageUrl ? [{ url: artist.mainImageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: artist.mainImageUrl ? [artist.mainImageUrl] : undefined,
    },
  };
}

function formatProgramDate(startAt: Date | null, endAt: Date | null) {
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

function ProgramCard({ credit }: { credit: ArtistProgramCredit }) {
  const { program, role } = credit;
  const dateStr = formatProgramDate(program.startAt, program.endAt);
  const location = [program.venue, program.city].filter(Boolean).join(', ');

  return (
    <Link
      href={`/programs/${program.slug}`}
      className="group flex gap-4 rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-900"
    >
      {program.heroUrl && (
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
          <Image
            src={getImageUrl(program.heroUrl, 'thumbnail')}
            alt={program.title}
            fill
            sizes="112px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        {role && (
          <span className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
            {role}
          </span>
        )}
        <h4 className="line-clamp-2 text-base font-medium leading-snug transition-colors group-hover:text-neutral-500">
          {program.title}
        </h4>
        <div className="mt-2 space-y-0.5 text-xs text-neutral-500">
          {dateStr && (
            <p className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {dateStr}
            </p>
          )}
          {location && (
            <p className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProgramSection({ credits }: { credits: ArtistProgramCredit[] }) {
  if (credits.length === 0) return null;

  const now = new Date();
  const upcoming = credits.filter(
    (c) => c.program.startAt && new Date(c.program.startAt) > now
  );
  const past = credits.filter(
    (c) => !c.program.startAt || new Date(c.program.startAt) <= now
  );

  return (
    <div>
      {upcoming.length > 0 && (
        <div className="mb-10">
          <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-400">
            Upcoming
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {upcoming.map((c) => (
              <ProgramCard key={c.program.id} credit={c} />
            ))}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          {upcoming.length > 0 && (
            <h3 className="mb-5 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-400">
              Past
            </h3>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {past.map((c) => (
              <ProgramCard key={c.program.id} credit={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SocialPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.15em] text-neutral-600 transition-colors hover:border-neutral-900 hover:text-neutral-900"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
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
  const artist = await getArtistById(id);

  if (!artist) notFound();

  const displayName = formatArtistName(
    artist.nameKr ?? null,
    artist.name ?? null
  );
  const secondaryName =
    artist.nameKr && artist.name && displayName !== artist.name
      ? artist.name
      : null;
  const location = [artist.city, artist.country].filter(Boolean).join(', ');
  const tags = artist.tags ?? [];
  const socials: [string | undefined, string][] = [
    [artist.homepage, 'Website'],
    [artist.instagram, 'Instagram'],
    [artist.soundcloud, 'SoundCloud'],
    [artist.bandcamp, 'Bandcamp'],
    [artist.youtube, 'YouTube'],
    [artist.spotify, 'Spotify'],
  ];
  const hasSocials = socials.some(([url]) => !!url);
  const hasGallery = artist.images.length > 0;
  const hasBio = !!artist.biography;
  const hasCv = !!artist.cv;
  const hasPrograms = artist.programCredits.length > 0;
  const hasArtworks = artist.artistArtworks.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
      <ArtistSchema
        artist={{
          id,
          name: artist.name,
          nameKr: artist.nameKr,
          mainImageUrl: artist.mainImageUrl,
          homepage: artist.homepage,
        }}
      />
      <BreadcrumbNav entityType="artist" title={displayName} />

      {/* Hero — 2분할: 이미지 + 메타 */}
      <section className="mt-8 grid gap-10 md:mt-12 md:grid-cols-[1.05fr_1fr] md:gap-12 lg:gap-16">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-100">
          {artist.mainImageUrl ? (
            <Image
              src={getImageUrl(artist.mainImageUrl, 'public')}
              alt={displayName}
              fill
              priority
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-20 w-20 text-neutral-300" />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
            Artist
          </p>
          <h1 className="mt-4 text-4xl font-light leading-[1.05] tracking-tight text-neutral-900 md:text-5xl lg:text-6xl">
            {displayName}
          </h1>
          {secondaryName && (
            <p className="mt-2 text-lg font-light text-neutral-500 md:text-xl">
              {secondaryName}
            </p>
          )}
          {artist.tagline && (
            <p className="mt-6 text-base leading-relaxed text-neutral-600 md:text-lg">
              {artist.tagline}
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
          {location && (
            <p className="mt-6 flex items-center gap-1.5 text-sm text-neutral-500">
              <MapPin className="h-4 w-4" />
              {location}
            </p>
          )}
          {hasSocials && (
            <div className="mt-6 flex flex-wrap gap-2">
              {socials
                .filter(([url]) => !!url)
                .map(([url, label]) => (
                  <SocialPill key={label} href={url as string} label={label} />
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
              {artist.biography}
            </div>
          </div>
        </section>
      )}

      {/* Gallery — full-bleed horizontal scroll */}
      {hasGallery && (
        <section className="py-20 md:py-28">
          <div className="mb-8 px-0 md:mb-10">
            <SectionHeading eyebrow="Gallery" />
          </div>
          <div className="-mx-6 md:-mx-10">
            <ArtistGallery images={artist.images} artistName={displayName} />
          </div>
        </section>
      )}

      {/* Programs */}
      {hasPrograms && (
        <section className="py-20 md:py-28">
          <SectionHeading eyebrow="Programs" />
          <ProgramSection credits={artist.programCredits} />
        </section>
      )}

      {/* Works */}
      {hasArtworks && (
        <section className="py-20 md:py-28">
          <SectionHeading eyebrow="Works" />
          <ArtworkListSection artistId={id} />
        </section>
      )}

      {/* CV */}
      {hasCv && (
        <section className="py-20 md:py-28">
          <details className="group">
            <summary className="flex cursor-pointer items-center justify-between gap-4 border-b border-neutral-200 pb-4 text-[11px] font-medium uppercase tracking-[0.25em] text-neutral-400 transition-colors hover:text-neutral-900">
              <span>Curriculum Vitae</span>
              <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            </summary>
            <div className="mt-8">
              <ArtistCv cv={artist.cv as string} />
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
