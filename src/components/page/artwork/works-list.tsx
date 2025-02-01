import Link from 'next/link';
import { formatDate, getImageUrl } from '@/lib/utils';
import Image from 'next/image';
import { getAllArtworks } from '@/app/artworks/actions';

const works = await getAllArtworks();

export default function WorksList() {
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
          href={`/works/${work.id}`}
          className="group relative aspect-square overflow-hidden rounded-lg"
        >
          <Image
            src={
              `${getImageUrl(work.images?.[0]?.imageUrl, 'public')}` ||
              '/api/placeholder/400/400'
            }
            alt={work.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
            <div className="absolute bottom-0 p-4 text-white">
              <h3 className="font-medium">{work.id}</h3>
              <p className="text-sm">{formatDate(new Date(work.createdAt))}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
