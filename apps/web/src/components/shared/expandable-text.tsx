'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * 긴 글을 6줄만 보여 주고 "더 보기"로 펼친다.
 * 전문은 항상 DOM에 있고 CSS(line-clamp)로만 접어 검색엔진·스크린리더는 전체를 읽는다.
 *
 * 줄 수는 렌더 전에 알 수 없고 글자 수로 짐작하면 "눌러도 변화 없는 버튼"이 생기므로,
 * 접힌 상태에서 실제로 잘렸는지(scrollHeight > clientHeight)를 재서 그때만 버튼을 낸다.
 * 폭이 바뀌면(회전·창 크기) 다시 잰다.
 */
export function ExpandableText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = ref.current;
    // 펼친 상태에선 잘린 게 없어 잴 수 없다 — 접힌 상태의 마지막 측정값을 쓴다.
    if (!el || open) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  return (
    <div>
      <p
        ref={ref}
        className={cn(
          'whitespace-pre-line break-words leading-relaxed text-neutral-700',
          !open && 'line-clamp-6',
          className
        )}
      >
        {text}
      </p>
      {(open || overflowing) && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="mt-3 text-sm text-neutral-500 underline-offset-4 transition-colors hover:text-neutral-900 hover:underline"
        >
          {open ? '접기' : '더 보기'}
        </button>
      )}
    </div>
  );
}
