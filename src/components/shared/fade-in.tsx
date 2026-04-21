'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface FadeInProps {
  children: React.ReactNode;
  /** 가시 시점 기준 지연(ms) — 카드 스태거용 */
  delay?: number;
  className?: string;
  /** viewport rootMargin — 기본은 아래쪽 10% 일찍 트리거 */
  rootMargin?: string;
}

/**
 * 요소가 뷰포트에 들어올 때 한 번만 페이드인 + 살짝 상승.
 * prefers-reduced-motion 유저는 즉시 visible.
 */
export function FadeIn({
  children,
  delay = 0,
  className,
  rootMargin = '0px 0px -10% 0px',
}: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.1, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
      className={cn(
        'transition-all duration-[700ms] ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0',
        className
      )}
    >
      {children}
    </div>
  );
}
