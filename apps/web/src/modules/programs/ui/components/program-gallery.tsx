'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  imageRatio,
  JustifiedGrid,
  JustifiedItem,
} from '@/components/image/justified-grid';
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

type GalleryImage = {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  caption: string | null;
};

/**
 * 프로그램 갤러리 — 이미지를 원본 비율대로 한 줄씩 채워 보여 주고,
 * 클릭하면 전체 화면 라이트박스(캡션 표시)로 넘겨 본다.
 */
export default function ProgramGallery({
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

  // 파일명이 들어 있던 alt 대신: 캡션이 있으면 캡션, 없으면 "제목 번호"
  const altOf = (img: GalleryImage, i: number) =>
    img.caption || `${title} ${i + 1}`;

  // 열 때 클릭한 이미지로 이동
  useEffect(() => {
    if (!open || !modalApi) return;
    modalApi.scrollTo(index, true);
  }, [open, modalApi, index]);

  // 라이트박스 현재 슬라이드 추적(캡션·카운터용)
  useEffect(() => {
    if (!modalApi) return;
    const onSelect = () => setCurrentSlide(modalApi.selectedScrollSnap());
    modalApi.on('select', onSelect);
    onSelect();
    return () => {
      modalApi.off('select', onSelect);
    };
  }, [modalApi]);

  const current = images[currentSlide];

  return (
    <div>
      <JustifiedGrid className="gap-y-2">
        {images.map((img, i) => {
          const ratio = imageRatio(img.width, img.height);
          return (
            <JustifiedItem key={img.id} ratio={ratio} rowHeight="md">
              <button
                type="button"
                aria-label={`${altOf(img, i)} 크게 보기`}
                onClick={() => {
                  setIndex(i);
                  setOpen(true);
                }}
                className="group relative block w-full overflow-hidden bg-neutral-100"
                style={{ aspectRatio: ratio }}
              >
                <Image
                  src={getImageUrl(img.imageUrl, 'smaller')}
                  alt={altOf(img, i)}
                  fill
                  sizes="(min-width: 1152px) 480px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
                />
              </button>
            </JustifiedItem>
          );
        })}
      </JustifiedGrid>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="border-none bg-background/95 p-0 shadow-none backdrop-blur-sm supports-backdrop-filter:bg-background/80 sm:max-w-5xl sm:rounded-xl md:max-w-6xl"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{title} 갤러리</DialogTitle>
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
                    <div className="relative aspect-16/10.5 w-full overflow-hidden bg-black">
                      <Image
                        src={getImageUrl(img.imageUrl, 'public')}
                        alt={altOf(img, i)}
                        fill
                        sizes="100vw"
                        className="object-contain"
                        priority={false}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-3 top-1/2 -translate-y-1/2 border-white/20 bg-black/40 text-white hover:bg-black/60" />
              <CarouselNext className="right-3 top-1/2 -translate-y-1/2 border-white/20 bg-black/40 text-white hover:bg-black/60" />
            </Carousel>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-4 text-white">
              <div className="mx-auto flex max-w-5xl items-end justify-between gap-3 text-xs sm:text-sm">
                <span className="min-w-0 break-words">{current?.caption}</span>
                <span className="shrink-0 rounded bg-white/10 px-2 py-0.5">
                  {currentSlide + 1} / {images.length}
                </span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
