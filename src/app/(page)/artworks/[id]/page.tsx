import { ImageIcon, User } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbNav from '@/components/layout/nav/breadcrum-nav';
import { MediaGallery } from '@/components/media/media-gallery';
import ArtworkSchema from '@/components/seo/artwork-schema';
import { BUSINESS_INFO } from '@/lib/constants/business-info';
import { prisma } from '@/lib/db/prisma';
import { formatArtistName, getImageUrl } from '@/lib/utils';
import { getArtworkById } from '@/modules/artworks/server/actions';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artwork = await prisma.artwork.findUnique({
    where: { id },
    select: {
      title: true,
      description: true,
      year: true,
      media: true,
      size: true,
      style: true,
      images: { select: { imageUrl: true }, take: 1 },
      artists: {
        select: { artist: { select: { name: true, nameKr: true } } },
      },
    },
  });

  if (!artwork) return { title: 'Artwork Not Found' };

  const artists = artwork.artists
    .map((a) =>
      formatArtistName(a.artist.nameKr ?? null, a.artist.name ?? null)
    )
    .join(', ');
  const title = artists ? `${artwork.title} — ${artists}` : artwork.title;
  const details = [
    artwork.year && `${artwork.year}`,
    artwork.media,
    artwork.size,
  ]
    .filter(Boolean)
    .join(' · ');
  const description = artwork.description || details || title;

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical: `${BUSINESS_INFO.serviceUrl}/artworks/${id}` },
    openGraph: {
      title: artwork.title,
      description: description.slice(0, 160),
      images: artwork.images[0]?.imageUrl
        ? [{ url: artwork.images[0].imageUrl }]
        : undefined,
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.slice(0, 160),
      images: artwork.images[0]?.imageUrl
        ? [artwork.images[0].imageUrl]
        : undefined,
    },
  };
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
  const artwork = await getArtworkById(id);

  if (!artwork) notFound();

  const heroImage = artwork.images[0];
  const details: { label: string; value: string }[] = [
    artwork.year && { label: 'Year', value: String(artwork.year) },
    artwork.media && { label: 'Media', value: artwork.media },
    artwork.size && { label: 'Size', value: artwork.size },
    artwork.style && { label: 'Style', value: artwork.style },
  ].filter(Boolean) as { label: string; value: string }[];
  const hasMultipleImages = artwork.images.length > 1;
  const hasDescription = !!artwork.description;
  const hasArtists = artwork.artists.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16">
      <ArtworkSchema artwork={artwork} />
      <BreadcrumbNav entityType="artwork" title={artwork.title} />

      {/* Hero — 작품 이미지가 주인공: 중앙 정렬, 원본 비율 유지 */}
      <section className="mt-8 md:mt-12">
        <div className="mx-auto max-w-4xl">
          <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden rounded-sm bg-neutral-50">
            {heroImage ? (
              <Image
                src={getImageUrl(heroImage.imageUrl, 'hires')}
                alt={heroImage.alt || artwork.title}
                fill
                priority
                sizes="(min-width: 1024px) 900px, 100vw"
                className="object-contain"
              />
            ) : (
              <ImageIcon className="h-24 w-24 text-neutral-300" />
            )}
          </div>
        </div>

        {/* 캡션 블록 — 잡지 도판 스타일 */}
        <div className="mx-auto mt-10 max-w-3xl md:mt-14">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-neutral-400">
            Artwork
          </p>
          <h1 className="mt-4 text-3xl font-light leading-[1.1] tracking-tight text-neutral-900 md:text-5xl">
            {artwork.title}
          </h1>

          {hasArtists && (
            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-base text-neutral-500 md:text-lg">
              {artwork.artists.map((rel, i) => {
                const name = formatArtistName(
                  rel.artist.nameKr ?? null,
                  rel.artist.name ?? null
                );
                return (
                  <span key={rel.artist.id}>
                    <Link
                      href={`/artists/${rel.artist.id}`}
                      className="hover:text-neutral-900 hover:underline"
                    >
                      {name}
                    </Link>
                    {i < artwork.artists.length - 1 ? ',' : ''}
                  </span>
                );
              })}
            </div>
          )}

          {details.length > 0 && (
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4 border-t border-neutral-200 pt-8">
              {details.map((d) => (
                <div key={d.label}>
                  <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                    {d.label}
                  </dt>
                  <dd className="mt-1 text-sm text-neutral-900">{d.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* Description */}
      {hasDescription && (
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-3xl">
            <SectionHeading eyebrow="About" />
            <div className="whitespace-pre-wrap text-base leading-[1.8] text-neutral-700 md:text-lg">
              {artwork.description}
            </div>
          </div>
        </section>
      )}

      {/* Additional images */}
      {hasMultipleImages && (
        <section className="py-20 md:py-28">
          <div className="mb-8 md:mb-10">
            <SectionHeading eyebrow="Gallery" />
          </div>
          <div className="-mx-6 md:-mx-10">
            <MediaGallery
              items={artwork.images.map((img) => ({
                id: img.id,
                type: 'image',
                url: img.imageUrl,
                alt: img.alt,
              }))}
              title={artwork.title}
            />
          </div>
        </section>
      )}

      {/* Artists */}
      {hasArtists && (
        <section className="py-20 md:py-28">
          <SectionHeading eyebrow="Artists" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {artwork.artists.map((rel) => {
              const name = formatArtistName(
                rel.artist.nameKr ?? null,
                rel.artist.name ?? null
              );
              return (
                <Link
                  key={rel.artist.id}
                  href={`/artists/${rel.artist.id}`}
                  className="group flex items-center gap-4"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-neutral-100">
                    {rel.artist.mainImageUrl ? (
                      <Image
                        src={getImageUrl(rel.artist.mainImageUrl, 'thumbnail')}
                        alt={name}
                        fill
                        sizes="64px"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User className="h-6 w-6 text-neutral-300" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                      Artist
                    </p>
                    <p className="mt-1 text-base font-medium leading-snug transition-colors group-hover:text-neutral-500">
                      {name}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
