'use client';

import { RotateCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { formatKstTime } from '@/lib/utils';

/**
 * 입장 기록 표는 페이지를 연 시점 기준이다(위 '현재 입장' 카드만 실시간).
 * 기준 시각을 보여주고 직접 다시 불러오게 한다 — 기록 표 전체를 주기적으로
 * 다시 읽으면 수천 행을 매번 내려받는다.
 */
export function LogRefreshButton({ loadedAt }: { loadedAt: Date }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="tabular-nums">{formatKstTime(loadedAt)} 기준</span>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => startTransition(() => router.refresh())}
      >
        <RotateCw
          className={`mr-1 h-3.5 w-3.5 ${pending ? 'motion-safe:animate-spin' : ''}`}
        />
        새로고침
      </Button>
    </div>
  );
}
