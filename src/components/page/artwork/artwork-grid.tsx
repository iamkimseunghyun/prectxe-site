'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getImageUrl } from '@/lib/utils';
import { Artwork as PrismaArtwork, ArtworkImage } from '@prisma/client';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { getMoreArtworks } from '@/app/artworks/actions';
import { PAGINATION } from '@/lib/constants/constants';
import InfiniteScroll from '@/components/page/artist/infinite-scroll';

type ArtworkWithImages = PrismaArtwork & {
  images: ArtworkImage[];
};

const ArtworkGrid = ({
  initialArtworks,
  searchQuery = '',
}: {
  initialArtworks: ArtworkWithImages[];
  searchQuery?: string;
}) => {
  const {
    items: artworks,
    isLoading,
    isLastPage,
    trigger,
  } = useInfiniteScroll({
    fetchFunction: getMoreArtworks,
    initialData: initialArtworks,
    searchQuery,
    pageSize: PAGINATION.ARTWORKS_PAGE_SIZE,
  });

  if (artworks.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-gray-500">등록된 작품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {artworks.map((artwork) => (
        <Link key={artwork.id} href={`/artworks/${artwork.id}`}>
          <Card className="overflow-hidden transition-shadow hover:shadow-lg">
            <CardHeader>
              <CardTitle className="line-clamp-1">{artwork.title}</CardTitle>
            </CardHeader>

            <CardContent>
              {artwork.images[0] && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                  <Image
                    priority
                    src={getImageUrl(`${artwork.images[0].imageUrl}`, 'public')}
                    alt={artwork.images[0].alt}
                    width={100}
                    height={300}
                    className="absolute inset-0 h-full w-full object-cover"
                    // sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}

              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-500">
                  {artwork.year}년 | {artwork.media}
                </p>
                <p className="text-sm text-gray-500">크기: {artwork.size}</p>
                <p className="line-clamp-2 text-sm">{artwork.description}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
      {!isLastPage && (
        <div>
          <InfiniteScroll trigger={trigger} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
};

export default ArtworkGrid;
