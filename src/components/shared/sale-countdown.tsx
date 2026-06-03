'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface SaleCountdownProps {
  /** 판매 시작 시각 (ISO 문자열). 없으면 null */
  saleStartIso?: string | null;
  /** 판매 종료 시각 (ISO 문자열). 없으면 null */
  saleEndIso?: string | null;
  /** 배경 톤 — dark: 어두운 배경 위 흰 텍스트 / light: 밝은 배경 위 어두운 텍스트 */
  tone?: 'dark' | 'light';
  className?: string;
}

const LIVE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48h 이내면 HH:MM:SS 라이브 티커
const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * 판매 시작/종료 카운트다운.
 * - 판매 시작 전: "판매 시작 D-N" (시작까지)
 * - 판매 중: "판매 마감 D-N" (종료까지)
 * - 평소 D-N 정적, 임박(≤48h) 시 HH:MM:SS 라이브 티커 (1초씩 감소)
 * - 표시할 윈도가 없거나 이미 종료면 아무것도 렌더하지 않음
 *
 * SSR/클라 시각 불일치로 인한 hydration mismatch를 피하려 마운트 전엔 null 렌더.
 */
export function SaleCountdown({
  saleStartIso,
  saleEndIso,
  tone = 'dark',
  className,
}: SaleCountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;

  const start = saleStartIso ? new Date(saleStartIso).getTime() : null;
  const end = saleEndIso ? new Date(saleEndIso).getTime() : null;

  let label: string;
  let target: number;
  if (start !== null && now < start) {
    label = '판매 시작';
    target = start;
  } else if (end !== null && now < end) {
    label = '판매 마감';
    target = end;
  } else {
    return null;
  }

  const remaining = target - now;

  let value: string;
  if (remaining > LIVE_THRESHOLD_MS) {
    // floor: 48h 경계에서 D-N → 라이브 티커 전환 시 하루 건너뛰지 않게
    value = `D-${Math.floor(remaining / DAY_MS)}`;
  } else {
    const totalSec = Math.max(0, Math.floor(remaining / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    value = `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  return (
    <div
      className={cn(
        'flex items-baseline gap-2',
        tone === 'dark' ? 'text-white' : 'text-neutral-900',
        className
      )}
    >
      <span
        className={cn(
          'text-[10px] font-medium uppercase tracking-[0.18em]',
          tone === 'dark' ? 'text-white/50' : 'text-neutral-400'
        )}
      >
        {label}
      </span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}
