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
  return (
    <Link key={artist.id} href={`/artists/${artist.id}`}>
      <div className="relative aspect-square overflow-hidden rounded-lg">
        <Image
          src={getImageUrl(`${artist.mainImageUrl}`, 'smaller')}
          alt={artist.name}
          fill
          priority
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          placeholder="blur"
          blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
          className="object-cover"
        />
        <div className="absolute inset-0 flex flex-col justify-end p-4">
          <h3 className="text-xl font-bold text-white">{artist.name}</h3>
          <p className="text-sm text-white">
            {artist.artistArtworks.length > 0
              ? `작품 ${artist.artistArtworks.length}개`
              : null}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default ArtistCard;
