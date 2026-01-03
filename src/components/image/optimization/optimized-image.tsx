import Image from 'next/image';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends HTMLAttributes<HTMLDivElement> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'portrait' | 'landscape';
  objectFit?: 'contain' | 'cover';
  quality?: number;
}

const aspectRatioClasses = {
  square: 'aspect-square',
  video: 'aspect-video',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
};

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  aspectRatio = 'square',
  objectFit = 'cover',
  ...props
}: OptimizedImageProps) {
  // GitHub 아바타 이미지인 경우 더 작은 크기로 최적화
  const isAvatar = src.includes('avatars.githubusercontent.com');
  const defaultWidth = isAvatar ? 400 : 1200;
  const defaultHeight = isAvatar ? 400 : 1200;
  // 이미지 URL이 상대 경로인 경우 처리
  const imageUrl = src.startsWith('/') ? src : src;
  return (
    <div
      className={cn(
        'overflow-hidden bg-muted',
        aspectRatioClasses[aspectRatio],
        className
      )}
      {...props}
    >
      <Image
        src={imageUrl}
        alt={alt}
        width={width || defaultWidth}
        height={height || defaultHeight}
        priority={priority}
        className={cn(
          'h-full w-full duration-300 ease-in-out',
          objectFit === 'contain' ? 'object-contain' : 'object-cover'
        )}
        sizes="(min-width: 1280px) 1200px, (min-width: 1024px) 1024px, (min-width: 768px) 768px, 100vw"
      />
    </div>
  );
}
