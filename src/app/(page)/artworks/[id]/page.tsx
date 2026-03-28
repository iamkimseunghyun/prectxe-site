import { ImageIcon } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import BreadcrumbNav from '@/components/layout/nav/breadcrum-nav';
import ArtworkSchema from '@/components/seo/artwork-schema';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/db/prisma';
import { formatArtistName, getImageUrl } from '@/lib/utils';
import { getArtworkById } from '@/modules/artworks/server/actions';
import ArtworkGallery from '@/modules/artworks/ui/section/artwork-gallery';

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
    alternates: { canonical: `https://prectxe.com/artworks/${id}` },
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

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const artwork = await getArtworkById(id);

  if (!artwork) notFound();

  const hasImages = artwork.images.length > 0;
  const hasDescription = !!artwork.description;
  const hasArtists = artwork.artists.length > 0;
  const details = [
    artwork.year && { label: 'Year', value: String(artwork.year) },
    artwork.media && { label: 'Media', value: artwork.media },
    artwork.size && { label: 'Size', value: artwork.size },
    artwork.style && { label: 'Style', value: artwork.style },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <ArtworkSchema artwork={artwork} />
      <BreadcrumbNav entityType="artwork" title={artwork.title} />

      {/* Image Gallery */}
      {hasImages ? (
        <section className="mb-10">
          <ArtworkGallery images={artwork.images} title={artwork.title} />
        </section>
      ) : (
        <section className="mb-10 flex aspect-[4/3] items-center justify-center rounded-lg bg-muted">
          <ImageIcon className="h-16 w-16 text-muted-foreground/40" />
        </section>
      )}

      {/* Title + Badges */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{artwork.title}</h1>
        {details.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {details.map((d) => (
              <Badge key={d.label} variant="secondary">
                {d.value}
              </Badge>
            ))}
          </div>
        )}
      </header>

      {/* Description */}
      {hasDescription && (
        <section className="border-t pt-8 pb-8">
          <h2 className="mb-4 text-lg font-semibold">Description</h2>
          <div className="prose max-w-none whitespace-pre-wrap text-muted-foreground">
            {artwork.description}
          </div>
        </section>
      )}

      {/* Artists */}
      {hasArtists && (
        <section className="border-t pt-8 pb-8">
          <h2 className="mb-4 text-lg font-semibold">Artists</h2>
          <div className="flex flex-wrap gap-4">
            {artwork.artists.map((rel) => {
              const name = formatArtistName(
                rel.artist.nameKr ?? null,
                rel.artist.name ?? null
              );
              return (
                <Link
                  key={rel.artist.id}
                  href={`/artists/${rel.artist.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  {rel.artist.mainImageUrl ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={getImageUrl(rel.artist.mainImageUrl, 'thumbnail')}
                        alt={name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                      {(rel.artist.nameKr || rel.artist.name)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium">{name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Details */}
      {details.length > 0 && (
        <section className="border-t pt-8 pb-8">
          <h2 className="mb-4 text-lg font-semibold">Details</h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            {details.map((d) => (
              <div key={d.label}>
                <dt className="text-muted-foreground">{d.label}</dt>
                <dd className="mt-0.5 font-medium">{d.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
