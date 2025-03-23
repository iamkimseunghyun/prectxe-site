import {
  Carousel as ShadcnCarousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { getImageUrl } from '@/lib/utils';
import Image from 'next/image';

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
              <div className="relative aspect-square sm:aspect-[16/10.5]">
                <Image
                  unoptimized
                  src={getImageUrl(image.imageUrl, 'public')}
                  alt={image.alt || '장소 이미지'}
                  width={1200}
                  height={800}
                  className="absolute inset-0 h-full w-full rounded-lg object-cover"
                  priority={index === 0}
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
