import {
  Carousel as ShadcnCarousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Image from 'next/image';
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
              <div className="relative aspect-square sm:aspect-video">
                <Image
                  src={getImageUrl(image.imageUrl, 'public')}
                  alt={image.alt || '장소 이미지'}
                  fill
                  className="rounded-lg object-cover"
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
