'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { getImageUrl } from '@/lib/utils';

type GalleryImage = { id: string; imageUrl: string; alt: string };

export default function ProgramGallery({ images }: { images: GalleryImage[] }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [api, setApi] = useState<CarouselApi | null>(null);

  useEffect(() => {
    if (!open || !api) return;
    api.scrollTo(index, true);
  }, [open, api, index]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => {
              setIndex(i);
              setOpen(true);
            }}
            className="group relative aspect-[4/3] overflow-hidden rounded-md"
            aria-label="이미지 확대 보기"
          >
            <Image
              src={getImageUrl(img.imageUrl, 'thumbnail')}
              alt={img.alt}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="border-none bg-background/95 p-0 shadow-2xl backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:max-w-5xl sm:rounded-xl md:max-w-6xl"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Gallery</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Carousel
              setApi={setApi}
              opts={{ loop: true }}
              className="w-full bg-black"
            >
              <CarouselContent className="ml-0 rounded-none">
                {images.map((img, i) => (
                  <CarouselItem key={img.id} className="pl-0">
                    <div className="relative aspect-[16/10.5] w-full overflow-hidden bg-black">
                      <Image
                        src={getImageUrl(img.imageUrl, 'public')}
                        alt={img.alt}
                        fill
                        sizes="100vw"
                        className="object-contain"
                        priority={false}
                      />
                      {/* Bottom caption overlay (hide filename) */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                        <div className="mx-auto flex max-w-5xl items-end justify-between gap-3 text-xs sm:text-sm">
                          {/* File name/alt hidden per request */}
                          <span className="shrink-0 rounded bg-white/10 px-2 py-0.5">
                            {i + 1} / {images.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-3 top-1/2 -translate-y-1/2 border-white/20 bg-black/40 text-white hover:bg-black/60" />
              <CarouselNext className="right-3 top-1/2 -translate-y-1/2 border-white/20 bg-black/40 text-white hover:bg-black/60" />
            </Carousel>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
