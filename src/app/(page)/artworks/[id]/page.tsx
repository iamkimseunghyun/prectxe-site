import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@radix-ui/react-select';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Image from 'next/image';

import { getArtworkById } from '@/app/(page)/artworks/actions';
import AdminButton from '@/components/admin-button';
import getSession from '@/lib/session';
import Link from 'next/link';
import BreadcrumbNav from '@/components/breadcrum-nav';
import canManage from '@/lib/can-manage';
import { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';

import { getImageUrl } from '@/lib/utils';
import { ImageData } from '@/lib/schemas';
import ArtworkSchema from '@/components/seoSchema/artwork-schema';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const artwork = await prisma.artwork.findUnique({
    where: { id: id },
    select: {
      title: true,
      description: true,
      year: true,
      media: true,
      size: true,
      style: true,
      images: {
        select: {
          imageUrl: true,
        },
        take: 1,
      },
      artists: {
        select: {
          artist: {
            select: {
              name: true,
              nameKr: true,
            },
          },
        },
      },
    },
  });

  if (!artwork) {
    return {
      title: 'Artwork Not Found',
    };
  }

  const artists = artwork.artists
    .map((a) => `${a.artist.nameKr} (${a.artist.name})`)
    .join(', ');
  const details = [
    artwork.year && `Year: ${artwork.year}`,
    artwork.media && `Media: ${artwork.media}`,
    artwork.size && `Size: ${artwork.size}`,
    artwork.style && `Style: ${artwork.style}`,
  ]
    .filter(Boolean)
    .join(' | ');

  return {
    title: `${artwork.title} by ${artists}`,
    description: artwork.description || `${artwork.title} - ${details}`,
    openGraph: {
      title: artwork.title,
      description: artwork.description || details,
      images: artwork.images[0]?.imageUrl
        ? [{ url: artwork.images[0].imageUrl }]
        : undefined,
      type: 'article',
    },
  };
}

export async function generateStaticParams() {
  const artworks = await prisma.artwork.findMany({
    select: { id: true },
  });

  return artworks.map((artwork) => ({
    id: artwork.id,
  }));
}

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const artwork = await getArtworkById(id);
  const session = await getSession();

  const canEdit = await canManage(session.id!, artwork.userId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <ArtworkSchema artwork={artwork} />
      <BreadcrumbNav entityType="artwork" title={artwork.title} />

      <div className="mb-8">
        {/* 이미지 갤러리 섹션 */}
        {artwork.images.length > 0 && (
          <section className="mb-12">
            <div className="mx-auto">
              <Carousel>
                <CarouselContent>
                  {artwork.images.map((image: ImageData) => (
                    <CarouselItem
                      key={image.id}
                      className="md:basis-1/2 lg:basis-1/3"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                        <Image
                          src={`${image.imageUrl}/smaller`}
                          alt={image.alt}
                          fill
                          priority
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          placeholder="blur"
                          blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
                          className="object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          </section>
        )}

        {/* 작품 정보 섹션 */}
        <Card className="p-6">
          <h1 className="mb-4 text-3xl font-bold">{artwork.title}</h1>
          <div className="flex gap-3">
            <Badge>{artwork.year}</Badge>
            <Badge variant="outline">{artwork.media}</Badge>
            <Badge variant="outline">{artwork.size}</Badge>
          </div>
          <Separator className="my-8" />
          <CardContent className="p-0">
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap text-gray-600">
                {artwork.description}
              </p>
            </div>
            <Separator className="my-8" />
            {/* 작가 정보 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900">작가 정보</h3>
                <div className="flex flex-wrap gap-4">
                  {artwork.artists && artwork.artists.length > 0 ? (
                    artwork.artists.map((artistRelation) => (
                      <div key={artistRelation.artistId}>
                        <Link
                          href={`/artists/${artistRelation.artist.id}`}
                          key={artistRelation.artist.id}
                          className="flex items-center gap-3"
                        >
                          {artistRelation.artist.mainImageUrl && (
                            <div className="relative h-16 w-16 overflow-hidden rounded-full">
                              <Image
                                src={getImageUrl(
                                  `${artistRelation.artist.mainImageUrl}`,
                                  'thumbnail'
                                )}
                                alt={
                                  artistRelation.artist.nameKr ||
                                  artistRelation.artist.name
                                }
                                fill
                                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                                placeholder="blur"
                                blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {artistRelation.artist.nameKr ||
                                artistRelation.artist.name}
                            </p>
                          </div>
                        </Link>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      등록된 작가 정보가 없습니다.
                    </p>
                  )}
                </div>
              </div>
              {/*<Separator className="my-4" />*/}
              <div className="space-y-2">
                <h3 className="font-semibold">작품 정보</h3>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-gray-500">스타일</dt>
                  <dd>{artwork.style}</dd>
                  <dt className="text-gray-500">제작 연도</dt>
                  <dd>{artwork.year}</dd>
                  <dt className="text-gray-500">크기</dt>
                  <dd>{artwork.size}</dd>
                  <dt className="text-gray-500">매체</dt>
                  <dd>{artwork.media}</dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {canEdit && (
        <div className="mt-6 flex justify-end gap-x-2">
          <AdminButton id={artwork.id} entityType="artwork" />
        </div>
      )}
    </div>
  );
};

export default Page;
