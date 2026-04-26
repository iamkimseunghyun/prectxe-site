import { ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatArtistName, getImageUrl } from '@/lib/utils';

export type ArtworkCardData = {
  id: string;
  title: string;
  year: number | null;
  media: string | null;
  size: string | null;
  images: { id: string; imageUrl: string; alt: string }[];
  artists: { artist: { id: string; name: string; nameKr: string } }[];
};

interface ArtworkCardProps {
  artwork: ArtworkCardData;
}

export default function ArtworkCard({ artwork }: ArtworkCardProps) {
  const firstImage = artwork.images[0];
  const artistNames = artwork.artists
    .map((a) =>
      formatArtistName(a.artist.nameKr ?? null, a.artist.name ?? null)
    )
    .join(', ');
  const meta = [artwork.year && `${artwork.year}`, artwork.media]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link href={`/artworks/${artwork.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-neutral-100">
        {firstImage ? (
          <Image
            src={getImageUrl(firstImage.imageUrl, 'smaller')}
            alt={firstImage.alt || artwork.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="h-12 w-12 text-neutral-300" />
          </div>
        )}
      </div>

      <div className="mt-5 space-y-1.5">
        <h3 className="text-base font-medium leading-snug tracking-tight transition-colors group-hover:text-neutral-500 md:text-lg">
          {artwork.title}
        </h3>
        {artistNames && (
          <p className="text-sm text-neutral-500">{artistNames}</p>
        )}
        {meta && (
          <p className="pt-1 text-xs uppercase tracking-[0.15em] text-neutral-400">
            {meta}
          </p>
        )}
      </div>
    </Link>
  );
}
