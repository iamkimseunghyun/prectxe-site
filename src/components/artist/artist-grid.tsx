// components/artists/ArtistGrid.tsx
import Image from 'next/image';
import Link from 'next/link';
import { getArtists } from '@/app/artists/actions';

export async function ArtistGrid({
  searchParams,
}: {
  searchParams?: { search?: string; category?: string };
}) {
  const artists = await getArtists(
    searchParams?.search
    // searchParams?.category
  );

  if (artists.length === 0) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">검색 결과가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {artists.map((artist) => (
        <Link
          key={artist.id}
          href={`/artists/${artist.id}`}
          className="group relative overflow-hidden rounded-lg"
        >
          <div className="relative aspect-square">
            <Image
              src={`${artist.mainImageUrl}/public`}
              alt={artist.name}
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              priority={false}
              fill
            />
          </div>
          <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent p-4">
            <h3 className="text-xl font-bold text-white">{artist.name}</h3>
            <p className="text-sm text-white/80">
              작품 {artist._count.artistArtworks}개
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
