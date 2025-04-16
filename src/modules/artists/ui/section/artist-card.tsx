import Link from 'next/link';
import Image from 'next/image';
import { getImageUrl } from '@/lib/utils';

interface ImageData {
  id: string;
  imageUrl: string;
  alt: string;
}
// 작품 타입
interface ArtworkData {
  id: string;
  title: string;
  description?: string | null;
  images: ImageData[];
}

interface ArtistData {
  id: string;
  name: string;
  nameKr?: string;
  mainImageUrl?: string | null;
  biography?: string | null;
  city?: string | null;
  country?: string | null;
  images?: ImageData[];
  artistArtworks: {
    artwork: ArtworkData;
  }[];
}

interface ArtistCardProps {
  artist: ArtistData;
}

const ArtistCard = ({ artist }: ArtistCardProps) => {
  const location = [artist.city, artist.country].filter(Boolean).join(', ');

  return (
    <Link
      key={artist.id}
      href={`/artists/${artist.id}`}
      className="group relative block aspect-square overflow-hidden rounded-lg shadow-md transition-shadow duration-300 hover:shadow-xl" // Added group and shadow
    >
      <Image
        src={getImageUrl(`${artist.mainImageUrl}`, 'smaller')}
        alt={artist.name}
        fill
        priority // Keep priority only if it's above the fold on initial load
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        placeholder="blur"
        blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
        className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-105" // Added transition and group-hover scale
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-95" />

      {/* Text Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4 text-white">
        <h3 className="text-xl font-bold drop-shadow-md">{artist.name}</h3>
        {artist.nameKr && (
          <p className="text-sm font-medium text-gray-200 drop-shadow-md">
            {artist.nameKr}
          </p>
        )}
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
