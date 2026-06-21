'use client';

import { useEffect, useState } from 'react';

type MobilePurchaseBarProps = {
  targetId: string;
  priceLabel: string;
  ctaLabel: string;
};

/**
 * 모바일 전용 하단 고정 예매 바.
 * 구매 섹션이 페이지 하단에 있어 스크롤 부담이 큰 모바일에서 즉시 예매 동선을 제공.
 * 데스크톱은 sticky 위젯이 있으므로 lg:hidden.
 */
export function MobilePurchaseBar({
  targetId,
  priceLabel,
  ctaLabel,
}: MobilePurchaseBarProps) {
  // 구매 섹션이 화면에 들어오면 바를 내려 실제 위젯·내부 CTA와 겹치지 않게 함
  const [sectionVisible, setSectionVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const io = new IntersectionObserver(
      ([entry]) => setSectionVisible(entry.isIntersecting),
      { rootMargin: '0px 0px -45% 0px' }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [targetId]);

  function scrollToPurchase() {
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-md transition-transform duration-300 lg:hidden ${
        sectionVisible ? 'translate-y-full' : 'translate-y-0'
      }`}
      style={{
        paddingTop: '0.75rem',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5">
        <p className="min-w-0 truncate text-base font-bold text-neutral-900">
          {priceLabel}
        </p>
        <button
          type="button"
          onClick={scrollToPurchase}
          className="shrink-0 rounded-full bg-neutral-900 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}
