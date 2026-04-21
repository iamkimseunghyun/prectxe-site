import {
  Calendar,
  ChevronRight,
  ExternalLink,
  Globe,
  MapPin,
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
    <section>
      <h2 className="mb-6 text-xl font-semibold">Programs</h2>
      {upcoming.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
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
            <h3 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
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
    </section>
  );
}

function ProgramCard({ credit }: { credit: ArtistProgramCredit }) {
  const { program, role } = credit;
  const dateStr = formatProgramDate(program.startAt, program.endAt);
  const location = [program.venue, program.city].filter(Boolean).join(', ');

  return (
    <Link
      href={`/programs/${program.slug}`}
      className="group flex gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      {program.heroUrl && (
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md">
          <Image
            src={getImageUrl(program.heroUrl, 'thumbnail')}
            alt={program.title}
            fill
            sizes="80px"
            className="object-cover"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-medium group-hover:underline">
          {program.title}
        </h4>
        {role && (
          <Badge variant="secondary" className="mt-1">
            {role}
          </Badge>
        )}
        {dateStr && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {dateStr}
          </p>
        )}
        {location && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {location}
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
  const artist = await getArtistById(id);

  if (!artist) notFound();

  const displayName = formatArtistName(
    artist.nameKr ?? null,
    artist.name ?? null
  );
  const location = [artist.city, artist.country].filter(Boolean).join(', ');
  const hasGallery = artist.images.length > 0;
  const hasBio = !!artist.biography;
  const hasCv = !!artist.cv;
  const hasPrograms = artist.programCredits.length > 0;
  const hasArtworks = artist.artistArtworks.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
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

      {/* Hero Header */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          {artist.nameKr && <span className="block">{artist.nameKr}</span>}
          <span
            className={
              artist.nameKr
                ? 'block text-xl font-normal text-muted-foreground'
                : ''
            }
          >
            {artist.name}
          </span>
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location}
            </span>
          )}
          {artist.homepage && (
            <a
              href={artist.homepage}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <Globe className="h-3.5 w-3.5" />
              웹사이트
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </header>

      {/* Profile Image + About */}
      {(artist.mainImageUrl || hasBio) && (
        <section className="border-t pt-10 pb-10">
          <div
            className={
              artist.mainImageUrl && hasBio
                ? 'grid items-start gap-8 md:grid-cols-2'
                : ''
            }
          >
            {artist.mainImageUrl && (
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                <Image
                  src={getImageUrl(artist.mainImageUrl, 'public')}
                  alt={displayName}
                  fill
                  priority
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            )}
            {hasBio && (
              <div className="self-start">
                <h2 className="mb-4 text-lg font-semibold">About</h2>
                <div className="prose max-w-none whitespace-pre-line text-muted-foreground">
                  {artist.biography}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Gallery */}
      {hasGallery && (
        <section className="border-t pt-10 pb-10">
          <h2 className="mb-4 text-lg font-semibold">Gallery</h2>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {artist.images.map((img) => (
              <div
                key={img.id}
                className="relative aspect-[4/5] w-56 shrink-0 overflow-hidden rounded-lg"
              >
                <Image
                  src={getImageUrl(img.imageUrl, 'smaller')}
                  alt={img.alt || displayName}
                  fill
                  sizes="224px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Programs */}
      {hasPrograms && (
        <section className="border-t pt-10 pb-10">
          <ProgramSection credits={artist.programCredits} />
        </section>
      )}

      {/* Works */}
      {hasArtworks && (
        <section className="border-t pt-10 pb-10">
          <h2 className="mb-6 text-xl font-semibold">Works</h2>
          <ArtworkListSection artistId={id} />
        </section>
      )}

      {/* CV */}
      {hasCv && (
        <section className="border-t pt-10 pb-10">
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 text-xl font-semibold">
              CV
              <ChevronRight className="h-5 w-5 transition-transform group-open:rotate-90" />
            </summary>
            <div className="prose mt-4 max-w-none whitespace-pre-line text-muted-foreground">
              {artist.cv}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
