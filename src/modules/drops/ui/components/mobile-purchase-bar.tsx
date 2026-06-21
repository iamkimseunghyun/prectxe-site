'use client';

import { ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';

type MobilePurchaseBarProps = {
  targetId: string;
  priceLabel: string;
  ctaLabel: string;
  /** 가격 위 소형 라벨 (예: Tickets / Goods) — 생략 시 가격만 단독 표기 */
  eyebrow?: string;
};

/**
 * 모바일 전용 하단 인셋 플로팅 예매 바.
 * 구매 섹션이 페이지 하단에 있어 스크롤 부담이 큰 모바일에서 즉시 예매 동선을 제공.
 * 데스크톱은 sticky 위젯이 있으므로 lg:hidden.
 * 디자인: 엣지-투-엣지 대신 둥근 글래스 카드를 하단에서 살짝 띄움(사이트 에디토리얼 무드).
 */
export function MobilePurchaseBar({
  targetId,
  priceLabel,
  ctaLabel,
  eyebrow,
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
      className={`fixed inset-x-0 bottom-0 z-40 px-4 transition-transform duration-300 ease-out lg:hidden ${
        sectionVisible ? 'translate-y-[calc(100%+2rem)]' : 'translate-y-0'
      }`}
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl border border-neutral-200/70 bg-white/85 px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">
              {eyebrow}
            </p>
          )}
          <p className="truncate text-base font-semibold tracking-tight text-neutral-900">
            {priceLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={scrollToPurchase}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
        >
          {ctaLabel}
          <ArrowUpRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
