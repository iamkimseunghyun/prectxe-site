'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** 저장된 초안을 불러왔을 때 뜨는 안내. 되돌릴 수단을 같이 준다. */
export function DraftRestoredNotice({ onDiscard }: { onDiscard: () => void }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
      role="status"
    >
      <span>작성 중이던 내용을 불러왔습니다.</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDiscard}
        className="h-7 shrink-0 text-amber-900 hover:bg-amber-100"
      >
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        새로 작성
      </Button>
    </div>
  );
}
