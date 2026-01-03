import Image from 'next/image';
import {
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  Carousel as ShadcnCarousel,
} from '@/components/ui/carousel';
import { getImageUrl } from '@/lib/utils';

type CarouselProps = {
  images: { imageUrl: string; alt?: string }[];
};

const CarouselGallery = ({ images }: CarouselProps) => {
  return (
    <div className="h-full w-full" style={{ minHeight: '100%' }}>
      <ShadcnCarousel className="h-full w-full">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div className="relative aspect-square overflow-hidden rounded-lg sm:aspect-[16/10.5]">
                <Image
                  src={getImageUrl(image.imageUrl, 'public')}
                  alt={image.alt || '장소 이미지'}
                  priority={index === 0}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="absolute left-4 top-1/2" />
        <CarouselNext className="absolute right-4 top-1/2" />
      </ShadcnCarousel>
    </div>
  );
};

export default CarouselGallery;
