'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getImageUrl } from '@/lib/utils';

type GalleryImage = { id: string; imageUrl: string; alt: string };

export default function ArtworkGallery({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [modalApi, setModalApi] = useState<CarouselApi | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleImageClick = useCallback((i: number) => {
    setIndex(i);
    setOpen(true);
  }, []);

  // Modal carousel sync
  useEffect(() => {
    if (!open || !modalApi) return;
    modalApi.scrollTo(index, true);
  }, [open, modalApi, index]);

  useEffect(() => {
    if (!modalApi) return;
    const onSelect = () => setCurrentSlide(modalApi.selectedScrollSnap());
    modalApi.on('select', onSelect);
    onSelect();
    return () => {
      modalApi.off('select', onSelect);
    };
  }, [modalApi]);

  if (images.length === 0) return null;

  return (
    <div>
      {/* Thumbnail grid/row */}
      {images.length === 1 ? (
        <button
          type="button"
          onClick={() => handleImageClick(0)}
          className="relative aspect-[4/3] w-full cursor-zoom-in overflow-hidden rounded-lg"
        >
          <Image
            src={getImageUrl(images[0].imageUrl, 'public')}
            alt={images[0].alt || title}
            fill
            priority
            sizes="(min-width: 768px) 80vw, 100vw"
            className="object-contain bg-muted"
          />
        </button>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((img, i) => (
            <button
              type="button"
              key={img.id}
              onClick={() => handleImageClick(i)}
              className="group relative aspect-square w-56 shrink-0 cursor-zoom-in overflow-hidden rounded-lg sm:w-64"
            >
              <Image
                src={getImageUrl(img.imageUrl, 'smaller')}
                alt={img.alt || title}
                fill
                priority={i === 0}
                sizes="(min-width: 640px) 256px, 224px"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="border-none bg-background/95 p-0 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:max-w-5xl sm:rounded-xl md:max-w-6xl"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Carousel
              setApi={setModalApi}
              opts={{ loop: true, startIndex: index }}
              className="w-full bg-black"
            >
              <CarouselContent className="ml-0 rounded-none">
                {images.map((img) => (
                  <CarouselItem key={img.id} className="pl-0">
                    <div className="relative aspect-[16/10.5] w-full overflow-hidden bg-black">
                      <Image
                        src={getImageUrl(img.imageUrl, 'public')}
                        alt={img.alt || title}
                        fill
                        sizes="100vw"
                        className="object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 && (
                <>
                  <CarouselPrevious className="left-3 top-1/2 -translate-y-1/2 border-white/20 bg-black/40 text-white hover:bg-black/60" />
                  <CarouselNext className="right-3 top-1/2 -translate-y-1/2 border-white/20 bg-black/40 text-white hover:bg-black/60" />
                </>
              )}
            </Carousel>
            {images.length > 1 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                <span className="rounded bg-white/10 px-2 py-0.5 text-xs sm:text-sm">
                  {currentSlide + 1} / {images.length}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
