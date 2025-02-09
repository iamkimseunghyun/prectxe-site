import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@radix-ui/react-select';

import { ImageIcon } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Image from 'next/image';
import { GalleryImage } from '@/lib/validations/gallery-image';
import { getArtworkById } from '@/app/artworks/actions';
import AdminButton from '@/components/admin-button';
import getSession from '@/lib/session';

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const artwork = await getArtworkById(id);
  const session = await getSession();
  return (
    <div className="mx-auto max-w-5xl py-10">
      <div className="mb-8">
        {/* 이미지 갤러리 섹션 */}
        {artwork.images.length > 0 && (
          <section className="mb-12">
            <h2 className="images-center mb-4 flex gap-2 text-2xl font-semibold">
              <ImageIcon className="size-5" />
              갤러리
            </h2>
            <div className="mx-auto">
              <Carousel>
                <CarouselContent>
                  {artwork.images.map((image: GalleryImage) => (
                    <CarouselItem
                      key={image.id}
                      className="md:basis-1/2 lg:basis-1/3"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                        <Image
                          src={`${image.imageUrl}/public`}
                          alt={image.alt}
                          fill
                          sizes="200"
                          priority
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
          <h1 className="mb-2 text-3xl font-bold">{artwork.title}</h1>
          <div className="mb-4 flex gap-2">
            <Badge>{artwork.year}</Badge>
            <Badge variant="outline">{artwork.media}</Badge>
            <Badge variant="outline">{artwork.size}</Badge>
          </div>
          <Separator className="my-4" />
          <CardContent className="p-0">
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap text-gray-600">
                {artwork.description}
              </p>
            </div>
            <Separator className="my-4" />
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
          </CardContent>
        </Card>
      </div>
      {session.id && (
        <div className="mt-6 flex justify-end gap-x-2">
          <AdminButton id={artwork.id} entityType="artwork" />
        </div>
      )}
    </div>
  );
};

export default Page;
