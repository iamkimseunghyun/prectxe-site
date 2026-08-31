import { Calendar, ExternalLink, MapPin, User } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbNav from '@/components/layout/nav/breadcrum-nav';
import { MediaGallery } from '@/components/media/media-gallery';
import ArtistSchema from '@/components/seo/artist-schema';
import { Badge } from '@/components/ui/badge';
import { BUSINESS_INFO } from '@/lib/constants/business-info';
import { formatArtistName, formatKstDateRange, getImageUrl } from '@/lib/utils';
import { getArtistByIdWithCache } from '@/modules/artists/server/queries';
import type {
  ArtistDropCredit,
  ArtistProgramCredit,
} from '@/modules/artists/server/types';
import { ArtistCv } from '@/modules/artists/ui/components/artist-cv';
import ArtworkListSection from '@/modules/artworks/ui/components/artwork-list-section';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  // 페이지 본문과 같은 캐시된 조회를 재사용한다. 예전에는 여기서 prisma를
  // 직접 호출해 요청마다 캐시를 우회한 DB 왕복이 한 번 더 발생했다.
  const artist = await getArtistByIdWithCache(id);

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
  const hero = artist.mainImageUrl
    ? getImageUrl(artist.mainImageUrl, 'public')
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: `${BUSINESS_INFO.serviceUrl}/artists/${id}` },
    openGraph: {
      title,
      description,
      images: hero ? [{ url: hero }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: hero ? [hero] : undefined,
    },
  };
}

function ProgramCard({ credit }: { credit: ArtistProgramCredit }) {
  const { program, role } = credit;
  const dateStr = program.startAt
    ? formatKstDateRange(
        new Date(program.startAt),
        program.endAt ? new Date(program.endAt) : null
      )
    : null;
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
        <h3 className="line-clamp-2 text-base font-medium leading-snug transition-colors group-hover:text-neutral-500">
          {program.title}
        </h3>
        <div className="mt-2 space-y-0.5 text-xs text-neutral-500">
          {dateStr && (
            <p className="flex items-center gap-1.5">
              <Calendar aria-hidden className="h-3.5 w-3.5" />
              {dateStr}
            </p>
          )}
          {location && (
            <p className="flex items-center gap-1.5">
              <MapPin aria-hidden className="h-3.5 w-3.5" />
              {location}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function DropCard({ credit }: { credit: ArtistDropCredit }) {
  const { drop, role } = credit;
  const dateStr = drop.eventDate
    ? formatKstDateRange(
        new Date(drop.eventDate),
        drop.eventEndDate ? new Date(drop.eventEndDate) : null
      )
    : null;
  const hero = drop.media[0];

  return (
    <Link
      href={`/drops/${drop.slug}`}
      className="group flex gap-4 rounded-xl border border-neutral-200 p-5 transition-colors hover:border-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
    >
      {hero && (
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
          <Image
            src={getImageUrl(hero.url, 'thumbnail')}
            alt={hero.alt || drop.title}
            fill
            sizes="112px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
          {role || (drop.type === 'ticket' ? 'Performance' : 'Goods')}
        </span>
        <h3 className="line-clamp-2 text-base font-medium leading-snug transition-colors group-hover:text-neutral-500">
          {drop.title}
        </h3>
        <div className="mt-2 space-y-0.5 text-xs text-neutral-500">
          {dateStr && (
            <p className="flex items-center gap-1.5">
              <Calendar aria-hidden className="h-3.5 w-3.5" />
              {dateStr}
            </p>
          )}
          {drop.venue && (
            <p className="flex items-center gap-1.5">
              <MapPin aria-hidden className="h-3.5 w-3.5" />
              {drop.venue}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function ProgramSection({ credits }: { credits: ArtistProgramCredit[] }) {
  if (credits.length === 0) return null;

  // Program은 아카이브 전용 — 참여 프로그램을 단일 목록으로 표시
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {credits.map((c) => (
        <ProgramCard key={c.program.id} credit={c} />
      ))}
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
      <ExternalLink aria-hidden className="h-3 w-3" />
      <span className="sr-only">(새 창에서 열림)</span>
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
  const artist = await getArtistByIdWithCache(id);

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
  const hasDrops = artist.dropCredits.length > 0;
  const hasArtworks = artist.artworkCount > 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
      <ArtistSchema
        artist={{
          id,
          name: artist.name,
          nameKr: artist.nameKr,
          mainImageUrl: artist.mainImageUrl,
          homepage: artist.homepage,
          instagram: artist.instagram,
          soundcloud: artist.soundcloud,
          bandcamp: artist.bandcamp,
          youtube: artist.youtube,
          spotify: artist.spotify,
        }}
      />
      <BreadcrumbNav entityType="artist" title={displayName} />

      {/* Hero — 2분할: 이미지 + 메타 */}
      <section className="mt-8 grid gap-10 md:mt-12 md:grid-cols-[1.05fr_1fr] md:gap-12 lg:gap-16">
        <div className="relative aspect-3/4 overflow-hidden rounded-2xl bg-neutral-100">
          {artist.mainImageUrl ? (
            <Image
              src={getImageUrl(artist.mainImageUrl, 'public')}
              alt={displayName}
              fill
              priority
              sizes="(min-width: 1152px) 590px, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User aria-hidden className="h-20 w-20 text-neutral-300" />
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
              <MapPin aria-hidden className="h-4 w-4" />
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

      {/* About — 인터뷰 페이지 톤: drop cap 강조 */}
      {hasBio && (
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-3xl">
            <SectionHeading eyebrow="About" />
            <div className="whitespace-pre-line text-base leading-[1.8] text-neutral-700 first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-5xl first-letter:font-light first-letter:leading-[0.9] first-letter:text-neutral-900 md:text-lg md:first-letter:text-6xl">
              {artist.biography}
            </div>
          </div>
        </section>
      )}

      {/* CV — 아티스트 서사의 핵심이라 기본 노출 */}
      {hasCv && (
        <section className="py-20 md:py-28">
          <SectionHeading eyebrow="Curriculum Vitae" />
          <div className="mx-auto max-w-4xl">
            <ArtistCv cv={artist.cv as string} />
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

      {/* Drops — 참여한 공연/굿즈 */}
      {hasDrops && (
        <section className="py-20 md:py-28">
          <SectionHeading eyebrow="Drops" />
          <div className="grid gap-4 sm:grid-cols-2">
            {artist.dropCredits.map((c) => (
              <DropCard key={c.drop.id} credit={c} />
            ))}
          </div>
        </section>
      )}

      {/* Works */}
      {hasArtworks && (
        <section className="py-20 md:py-28">
          <SectionHeading eyebrow="Works" />
          <ArtworkListSection artistId={id} />
        </section>
      )}

      {/* Gallery — 시각 마무리, 전체 스크롤 */}
      {hasGallery && (
        <section className="py-20 md:py-28">
          <div className="mb-8 px-0 md:mb-10">
            <SectionHeading eyebrow="Gallery" />
          </div>
          <div className="-mx-6 md:-mx-10">
            <MediaGallery
              items={artist.images.map((img) => ({
                id: img.id,
                type: 'image',
                url: img.imageUrl,
                alt: img.alt,
              }))}
              title={displayName}
            />
          </div>
        </section>
      )}
    </div>
  );
}
