import { OptimizedImage } from '@/components/image/optimization/optimized-image';
import { ArtworkWithRelations } from '@/types/schema';
import { cn, getImageUrl } from '@/lib/utils';

interface ArtworkHeroProps {
  artwork: ArtworkWithRelations;
  className?: string;
}

const ArtworkHero = ({ artwork, className }: ArtworkHeroProps) => {
  const mainImage = artwork.images[0];

  if (!mainImage) return null;

  return (
    <div className={cn('relative mx-auto w-full max-w-screen-xl', className)}>
      <OptimizedImage
        src={getImageUrl(mainImage.imageUrl, 'public')}
        alt={mainImage.alt}
        priority
        className="max-h-[70vh] w-full"
        aspectRatio="video"
        objectFit="contain"
        quality={90}
      />
      {artwork.images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
          {artwork.images.slice(1).map((image, index) => (
            <OptimizedImage
              key={`${image.imageUrl}-${index}`}
              src={getImageUrl(image.imageUrl, 'smaller')}
              alt={image.alt}
              aspectRatio="square"
              className="cursor-pointer transition-opacity hover:opacity-80"
              quality={75}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtworkHero;
