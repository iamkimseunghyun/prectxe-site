'use client';

import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { CloudflareStreamVideo } from '@/components/cloudflare-stream-video';
import { getImageUrl } from '@/lib/utils';

export type MediaGalleryItem = {
  id: string;
  type: 'image' | 'video';
  /** image: Cloudflare Images URL / video: Cloudflare Stream ID 또는 YouTube URL */
  url: string;
  alt?: string;
};

interface MediaGalleryProps {
  items: MediaGalleryItem[];
  title: string;
  /** 썸네일 가로 폭 (px 기반 유틸 클래스) */
  thumbWidth?: 'sm' | 'md' | 'lg';
  /** 썸네일 비율 — 기본 4/5 */
  aspect?: '4/5' | '1/1' | '3/4' | '16/9';
}

const WIDTH_CLASS: Record<
  NonNullable<MediaGalleryProps['thumbWidth']>,
  string
> = {
  sm: 'w-44 md:w-52',
  md: 'w-60 md:w-72',
  lg: 'w-72 md:w-96',
};

const ASPECT_CLASS: Record<NonNullable<MediaGalleryProps['aspect']>, string> = {
  '4/5': 'aspect-[4/5]',
  '1/1': 'aspect-square',
  '3/4': 'aspect-[3/4]',
  '16/9': 'aspect-video',
};

export function MediaGallery({
  items,
  title,
  thumbWidth = 'md',
  aspect = '4/5',
}: MediaGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(() => {
    setOpenIndex((i) =>
      i === null ? null : Math.min(items.length - 1, i + 1)
    );
  }, [items.length]);
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

  if (items.length === 0) return null;

  return (
    <>
      <ul className="flex list-none gap-3 overflow-x-auto scroll-smooth px-6 pb-2 scrollbar-hide md:px-10">
        {items.map((item, i) => (
          <li key={item.id} className="shrink-0">
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className={`group relative block overflow-hidden rounded-xl bg-neutral-100 ${WIDTH_CLASS[thumbWidth]} ${ASPECT_CLASS[aspect]}`}
              aria-label={`${item.alt || title} 확대`}
            >
              {item.type === 'image' ? (
                <Image
                  src={getImageUrl(item.url, 'smaller')}
                  alt={item.alt || title}
                  fill
                  sizes="(min-width: 768px) 288px, 240px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              ) : (
                <>
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                    <Play className="h-10 w-10 text-white/80" />
                  </div>
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-neutral-900">
                    Video
                  </span>
                </>
              )}
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') close();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} 갤러리 뷰어`}
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
          {openIndex < items.length - 1 && (
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
          <div className="relative w-full max-w-5xl">
            {items[openIndex].type === 'image' ? (
              <div className="relative mx-auto aspect-[4/5] max-h-[88vh] w-auto">
                <Image
                  src={getImageUrl(items[openIndex].url, 'hires')}
                  alt={items[openIndex].alt || title}
                  fill
                  sizes="100vw"
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <div className="relative mx-auto aspect-video max-h-[88vh] w-full">
                <CloudflareStreamVideo
                  videoUrl={items[openIndex].url}
                  controls
                  className="h-full w-full"
                />
              </div>
            )}
            <p className="mt-4 text-center text-xs uppercase tracking-[0.2em] text-white/50">
              {openIndex + 1} / {items.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
