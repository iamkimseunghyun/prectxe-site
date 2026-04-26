import { User } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatArtistName, getImageUrl } from '@/lib/utils';
import type { ArtistCardData } from '../../server/types';

interface ArtistCardProps {
  artist: ArtistCardData;
}

const ArtistCard = ({ artist }: ArtistCardProps) => {
  const location = [artist.city, artist.country].filter(Boolean).join(', ');
  const displayName = formatArtistName(
    artist.nameKr ?? null,
    artist.name ?? null
  );
  const visibleTags = (artist.tags ?? []).slice(0, 2);

  return (
    <Link href={`/artists/${artist.id}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-neutral-100">
        {artist.mainImageUrl ? (
          <Image
            src={getImageUrl(artist.mainImageUrl, 'smaller')}
            alt={displayName}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-16 w-16 text-neutral-300" />
          </div>
        )}
      </div>

      <div className="mt-5 space-y-1.5">
        <h3 className="text-base font-medium leading-snug tracking-tight transition-colors group-hover:text-neutral-500 md:text-lg">
          {displayName}
        </h3>
        {artist.tagline && (
          <p className="line-clamp-2 text-sm text-neutral-500">
            {artist.tagline}
          </p>
        )}
        {(visibleTags.length > 0 || location) && (
          <p className="pt-1 text-xs uppercase tracking-[0.15em] text-neutral-400">
            {[...visibleTags, location].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    </Link>
  );
};

export default ArtistCard;
