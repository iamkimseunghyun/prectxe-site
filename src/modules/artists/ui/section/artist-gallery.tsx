'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { getImageUrl } from '@/lib/utils';

type GalleryImage = { id: string; imageUrl: string; alt: string };

interface ArtistGalleryProps {
  images: GalleryImage[];
  artistName: string;
}

export function ArtistGallery({ images, artistName }: ArtistGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(() => {
    setOpenIndex((i) =>
      i === null ? null : Math.min(images.length - 1, i + 1)
    );
  }, [images.length]);
  const prev = useCallback(() => {
    setOpenIndex((i) => (i === null ? null : Math.max(0, i - 1)));
  }, []);

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [openIndex, close, next, prev]);

  return (
    <>
      <ul className="flex list-none gap-3 overflow-x-auto scroll-smooth px-6 pb-2 scrollbar-hide md:px-10">
        {images.map((img, i) => (
          <li key={img.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative block aspect-[4/5] w-60 overflow-hidden rounded-xl bg-neutral-100 md:w-72"
              aria-label={`${img.alt || artistName} 이미지 확대`}
            >
              <Image
                src={getImageUrl(img.imageUrl, 'smaller')}
                alt={img.alt || artistName}
                fill
                sizes="(min-width: 768px) 288px, 240px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6 backdrop-blur-sm"
          onClick={close}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') close();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`${artistName} 갤러리 뷰어`}
          tabIndex={-1}
        >
          <button
            type="button"
            onClick={close}
            aria-label="닫기"
            className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          {openIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              aria-label="이전"
              className="absolute left-4 flex h-12 w-12 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white md:left-8"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {openIndex < images.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              aria-label="다음"
              className="absolute right-4 flex h-12 w-12 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white md:right-8"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[88vh] w-full max-w-5xl cursor-default"
            aria-label="이미지 영역"
          >
            <div className="relative mx-auto aspect-[4/5] max-h-[88vh] w-auto">
              <Image
                src={getImageUrl(images[openIndex].imageUrl, 'hires')}
                alt={images[openIndex].alt || artistName}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>
            <p className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-white/50">
              {openIndex + 1} / {images.length}
            </p>
          </button>
        </div>
      )}
    </>
  );
}
