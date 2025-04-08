import Link from 'next/link';
import { getImageUrl } from '@/lib/utils';
import Image from 'next/image';
import { getArtworksByArtistId } from '@/modules/artworks/server/actions';

const ArtworkListSection = async ({ artistId }: { artistId: string }) => {
  const works = await getArtworksByArtistId(artistId);

  if (works.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        등록된 작품이 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {works.map((work) => (
        <Link
          key={work.id}
          href={`/artworks/${work.id}`}
          className="group relative aspect-square overflow-hidden rounded-lg"
        >
          <Image
            src={
              `${getImageUrl(work.images?.[0]?.imageUrl, 'smaller')}` ||
              '/api/placeholder/400/400'
            }
            alt={work.title}
            width={500}
            height={500}
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
            <div className="absolute bottom-0 p-4 text-white">
              <h3 className="font-medium">{work.title}</h3>
              <p className="text-sm">{work.year}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ArtworkListSection;
