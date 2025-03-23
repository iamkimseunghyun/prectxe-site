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
    <Link
      key={artist.id}
      href={`/artists/${artist.id}`}
      className="group relative overflow-hidden rounded-lg"
    >
      <div className="relative aspect-square">
        <Image
          src={getImageUrl(`${artist.mainImageUrl}`, 'smaller')}
          width={200}
          height={200}
          alt={artist.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        />
      </div>
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-4">
        <h3 className="text-xl font-bold text-white">{artist.name}</h3>
        <p className="text-sm text-white/80">
          {artist.artistArtworks.length > 0
            ? `작품 {artist.artistArtworks.length}개`
            : null}
        </p>
      </div>
    </Link>
  );
};

export default ArtistCard;
