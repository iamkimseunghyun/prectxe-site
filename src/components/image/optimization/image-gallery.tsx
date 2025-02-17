import { OptimizedImage } from '@/components/image/optimization/optimized-image';
import { cn } from '@/lib/utils';

interface GalleryImage {
  imageUrl: string;
  alt: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape' | undefined;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  variant?: 'grid' | 'masonry';
  className?: string;
  priority?: boolean;
}

export function ImageGallery({
  images,
  variant = 'grid',
  className,
  priority = false,
}: ImageGalleryProps) {
  if (variant === 'masonry') {
    return (
      <div
        className={cn('columns-1 gap-4 sm:columns-2 lg:columns-3', className)}
      >
        {images.map((image, index) => (
          <div key={`${image.imageUrl}-${index}`} className="mb-4">
            <OptimizedImage
              src={image.imageUrl}
              alt={image.alt}
              className="w-full"
              aspectRatio={
                image.aspectRatio ||
                (index % 2 === 0 ? 'portrait' : 'landscape')
              }
              priority={index === 0 && priority}
              quality={85}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {images.map((image, index) => (
        <OptimizedImage
          key={`${image.imageUrl}-${index}`}
          src={image.imageUrl}
          alt={image.alt}
          aspectRatio={image.aspectRatio || 'square'}
          priority={index === 0 && priority}
          quality={85}
        />
      ))}
    </div>
  );
}
