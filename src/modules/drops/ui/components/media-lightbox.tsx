'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect } from 'react';
import { CloudflareStreamVideo } from '@/components/cloudflare-stream-video';
import { getImageUrl } from '@/lib/utils';

export type LightboxMedia = {
  id: string;
  type: 'image' | 'video';
  url: string;
  alt: string;
};

interface MediaLightboxProps {
  media: LightboxMedia[];
  /** null이면 닫혀있는 상태 */
  activeIndex: number | null;
  onClose: () => void;
  onIndexChange: (next: number) => void;
}

export function MediaLightbox({
  media,
  activeIndex,
  onClose,
  onIndexChange,
}: MediaLightboxProps) {
  const total = media.length;
  const active = activeIndex !== null ? media[activeIndex] : null;

  const prev = useCallback(() => {
    if (activeIndex === null) return;
    onIndexChange((activeIndex - 1 + total) % total);
  }, [activeIndex, total, onIndexChange]);

  const next = useCallback(() => {
    if (activeIndex === null) return;
    onIndexChange((activeIndex + 1) % total);
  }, [activeIndex, total, onIndexChange]);

  // 키보드 + body overflow 처리
  useEffect(() => {
    if (activeIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [activeIndex, onClose, prev, next]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>

      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            prev();
          }}
          className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="이전"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      <div
        className="relative flex h-[85vh] w-[90vw] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {active.type === 'image' ? (
          <Image
            src={getImageUrl(active.url, 'hires')}
            alt={active.alt}
            width={1200}
            height={900}
            className="h-auto max-h-full w-auto max-w-full rounded-lg object-contain"
          />
        ) : (
          // key prop으로 활성 미디어 변경 시 컴포넌트 재마운트 → 이전 영상 자동 정지
          <CloudflareStreamVideo
            key={active.id}
            videoUrl={active.url}
            autoPlay
            controls
            className="h-full w-full rounded-lg object-contain"
          />
        )}
      </div>

      {total > 1 && activeIndex !== null && (
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/60">
          {activeIndex + 1} / {total}
        </p>
      )}

      {total > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          aria-label="다음"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
