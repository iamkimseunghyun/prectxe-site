'use client';

import { Share2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from '@/hooks/use-toast';

type Props = {
  title: string;
  text?: string | null;
  className?: string;
  /** 아이콘 옆에 표시할 라벨. 생략하면 아이콘만 렌더(터치 타깃용) */
  label?: string;
  /** 아이콘 크기 등 커스터마이즈 (기본 h-5 w-5) */
  iconClassName?: string;
};

/**
 * 현재 페이지를 공유하는 버튼.
 * - 모바일: navigator.share 네이티브 공유 시트(카톡·인스타 등 바로 공유)
 * - 데스크톱/미지원: 클립보드에 URL 복사 + toast
 */
export function ShareButton({
  title,
  text,
  className,
  label,
  iconClassName = 'h-5 w-5',
}: Props) {
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      setSharing(true);
      const url = typeof window !== 'undefined' ? window.location.href : '';

      if (navigator.share) {
        // 네이티브 공유 시트 자체가 결과를 알려주므로 별도 toast 없음
        await navigator.share({ title, text: text ?? undefined, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast({
        title: '링크 복사됨',
        description: '현재 페이지 URL을 복사했어요.',
      });
    } catch (err) {
      // 사용자가 공유 시트를 닫은 경우(AbortError)는 정상 취소 — 에러 아님
      if (err instanceof DOMException && err.name === 'AbortError') return;
      toast({
        title: '공유 실패',
        description: '공유에 문제가 발생했어요. 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setSharing(false);
    }
  }, [title, text]);

  return (
    <button
      className={
        className ??
        'inline-flex items-center gap-1.5 rounded text-sm underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      }
      type="button"
      aria-label="공유하기"
      onClick={handleShare}
      disabled={sharing}
    >
      <Share2 className={iconClassName} aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </button>
  );
}
