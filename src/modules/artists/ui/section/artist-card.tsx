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

  return (
    <Link
      href={`/artists/${artist.id}`}
      className="group relative block aspect-square overflow-hidden rounded-sm shadow-md transition-shadow duration-300 hover:shadow-xl"
    >
      {artist.mainImageUrl ? (
        <Image
          src={getImageUrl(artist.mainImageUrl, 'smaller')}
          alt={displayName}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted">
          <User className="h-16 w-16 text-muted-foreground/40" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-95" />
      <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
        <h3 className="text-xl font-bold drop-shadow-md">{displayName}</h3>
        {location && (
          <p className="mt-1 text-xs text-gray-300 drop-shadow-md">
            {location}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-300 drop-shadow-md">
          {artist.artistArtworks.length > 0
            ? `작품 ${artist.artistArtworks.length}개`
            : '프로필 준비중'}
        </p>
      </div>
    </Link>
  );
};

export default ArtistCard;
