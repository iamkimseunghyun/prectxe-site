'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [modalApi, setModalApi] = useState<CarouselApi | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [hasDragged, setHasDragged] = useState(false);

  // Auto-scroll effect
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || isPaused || open || isDragging) return;

    const speed = 0.5; // pixels per frame
    let animationId: number;

    const scroll = () => {
      if (
        container.scrollLeft >=
        container.scrollWidth - container.clientWidth
      ) {
        container.scrollLeft = 0;
      } else {
        container.scrollLeft += speed;
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, open, isDragging]);

  // Modal carousel sync
  useEffect(() => {
    if (!open || !modalApi) return;
    modalApi.scrollTo(index, true);
  }, [open, modalApi, index]);

  const handleImageClick = useCallback(
    (i: number) => {
      if (hasDragged) return; // Prevent click after drag
      setIndex(i);
      setOpen(true);
    },
    [hasDragged]
  );

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = scrollRef.current;
    if (!container) return;
    setIsDragging(true);
    setHasDragged(false);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeft(container.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const container = scrollRef.current;
    if (!container) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5; // scroll speed multiplier
    container.scrollLeft = scrollLeft - walk;
    if (Math.abs(x - startX) > 5) {
      setHasDragged(true); // Mark as dragged if moved more than 5px
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Reset hasDragged after a short delay to allow click prevention
    setTimeout(() => setHasDragged(false), 100);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHasDragged(false);
    setIsPaused(false);
  };

  return (
    <div>
      {/* Horizontal scroll gallery */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className={`scrollbar-hide -mx-4 flex gap-3 overflow-x-auto px-4 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => handleImageClick(i)}
            className="group relative aspect-[4/3] w-64 shrink-0 overflow-hidden sm:w-72"
          >
            <Image
              src={getImageUrl(img.imageUrl, 'thumbnail')}
              alt={img.alt}
              fill
              sizes="(min-width: 640px) 288px, 256px"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {/* Fullscreen modal */}
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
              setApi={setModalApi}
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
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                        <div className="mx-auto flex max-w-5xl items-end justify-between gap-3 text-xs sm:text-sm">
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
