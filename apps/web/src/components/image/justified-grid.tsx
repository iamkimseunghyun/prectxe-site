import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * 이미지를 원본 비율대로 한 줄에 맞춰 배치하는 갤러리 레이아웃(순수 CSS).
 *
 * 각 항목이 `flex-grow: 비율`, `flex-basis: 비율 × 행 높이`를 가지면 한 줄에 놓인
 * 항목들의 너비가 비율에 비례해 늘어나 높이가 같아진다. 마지막 줄이 억지로
 * 늘어나지 않도록 컨테이너 끝에 `grow-[999]` 가상 요소를 둔다.
 * JS가 없고 비율을 미리 알아 레이아웃이 밀리지 않는다(CLS 없음).
 *
 * 항목은 안쪽 박스에 `style={{ aspectRatio: ratio }}`를 줘서 높이를 잡는다.
 */

const MIN_RATIO = 0.7; // 아주 긴 세로 사진이 좁은 띠가 되지 않도록
const MAX_RATIO = 2.4; // 아주 긴 가로 사진이 줄 전체를 먹지 않도록
const FALLBACK_RATIO = 4 / 3; // 크기를 모르는 이미지(백필 전·HEIC)

/** 원본 크기 → 배치용 비율. 범위를 벗어나면 clamp(object-cover로 살짝 잘린다). */
export function imageRatio(width?: number | null, height?: number | null) {
  if (!width || !height) return FALLBACK_RATIO;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, width / height));
}

export function JustifiedGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-2 gap-y-6 after:grow-[999] after:content-[''] sm:gap-x-3",
        className
      )}
    >
      {children}
    </div>
  );
}

// 행 높이는 화면 폭에 따라 달라진다(비율 × 행 높이가 한 항목의 기본 너비).
const ROW_HEIGHT = {
  lg: '[--row-h:170px] sm:[--row-h:220px] lg:[--row-h:260px]',
  md: '[--row-h:130px] sm:[--row-h:170px] lg:[--row-h:200px]',
} as const;

export function JustifiedItem({
  ratio,
  rowHeight = 'lg',
  className,
  children,
}: {
  ratio: number;
  rowHeight?: keyof typeof ROW_HEIGHT;
  className?: string;
  children: ReactNode;
}) {
  const style: CSSProperties = {
    flexGrow: ratio,
    flexBasis: `calc(${ratio} * var(--row-h))`,
  };
  return (
    <div
      className={cn('min-w-0', ROW_HEIGHT[rowHeight], className)}
      style={style}
    >
      {children}
    </div>
  );
}
