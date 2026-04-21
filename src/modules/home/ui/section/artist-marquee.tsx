'use client';

interface ArtistMarqueeProps {
  names: string[];
}

/**
 * 아티스트 이름을 가로로 흐르는 마퀴.
 * 원본 + 복제를 이어붙여 seamless loop — translateX(-50%)까지 이동.
 * hover 시 일시정지, prefers-reduced-motion이면 정지(CSS에서 처리).
 */
export function ArtistMarquee({ names }: ArtistMarqueeProps) {
  const doubled = [...names, ...names];

  return (
    <div className="group flex select-none overflow-hidden">
      <div className="animate-marquee flex shrink-0 items-center gap-x-12 whitespace-nowrap pr-12 group-hover:[animation-play-state:paused] md:gap-x-20 md:pr-20">
        {doubled.map((name, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: 순수 장식 — 정렬·변경 없음
            key={i}
            aria-hidden={i >= names.length ? 'true' : undefined}
            className="text-3xl font-light tracking-tight text-neutral-600 transition-colors hover:text-white md:text-5xl lg:text-6xl"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
