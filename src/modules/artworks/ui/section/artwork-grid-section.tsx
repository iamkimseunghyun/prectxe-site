'use client';

import { ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import Spinner from '@/components/icons/spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll';
import { PAGINATION } from '@/lib/constants/constants';
import { getImageUrl } from '@/lib/utils';
import { getMoreArtworks } from '@/modules/artworks/server/actions';

type ArtworkCardData = {
  id: string;
  title: string;
  description: string | null;
  year: number | null;
  media: string | null;
  size: string | null;
  images: { id: string; imageUrl: string; alt: string }[];
  artists: { artist: { name: string } }[];
};

const ArtworkGridSection = ({
  initialArtworks,
}: {
  initialArtworks: ArtworkCardData[];
}) => {
  const {
    items: artworks,
    isLoading,
    isLastPage,
    trigger,
  } = useInfiniteScroll({
    fetchFunction: getMoreArtworks,
    initialData: initialArtworks,
    pageSize: PAGINATION.ARTWORKS_PAGE_SIZE,
  });

  if (artworks.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted-foreground">등록된 작품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {artworks.map((artwork) => {
          const firstImage = artwork.images[0];
          const meta = [artwork.year && `${artwork.year}`, artwork.media]
            .filter(Boolean)
            .join(' · ');

          return (
            <Link key={artwork.id} href={`/artworks/${artwork.id}`}>
              <Card className="overflow-hidden transition-shadow hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="line-clamp-1 text-base">
                    {artwork.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {firstImage ? (
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg">
                      <Image
                        src={getImageUrl(firstImage.imageUrl, 'smaller')}
                        alt={firstImage.alt || artwork.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-muted">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="mt-3 space-y-1">
                    {meta && (
                      <p className="text-sm text-muted-foreground">{meta}</p>
                    )}
                    {artwork.size && (
                      <p className="text-xs text-muted-foreground">
                        {artwork.size}
                      </p>
                    )}
                    {artwork.description && (
                      <p className="line-clamp-2 text-sm">
                        {artwork.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
      {!isLastPage && (
        <span ref={trigger} className="mt-10 flex items-center justify-center">
          {isLoading ? (
            <Spinner />
          ) : (
            <Button
              variant="ghost"
              className="mt-10 flex items-center justify-center text-muted-foreground"
            >
              더 보기
            </Button>
          )}
        </span>
      )}
    </div>
  );
};

export default ArtworkGridSection;
