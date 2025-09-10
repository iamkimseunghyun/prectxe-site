'use client';

import { Share2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useCallback, useState } from 'react';

type Props = {
  title: string;
  text?: string | null;
  className?: string;
};

export default function ShareButton({ title, text, className }: Props) {
  const [sharing, setSharing] = useState(false);

  const handleShare = useCallback(async () => {
    try {
      setSharing(true);
      const url = typeof window !== 'undefined' ? window.location.href : '';

      if (navigator.share) {
        await navigator.share({ title, text: text ?? undefined, url });
        toast({ title: '공유 완료', description: '링크가 공유되었습니다.' });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast({
        title: '링크 복사됨',
        description: '현재 페이지 URL을 복사했어요.',
      });
    } catch (_err) {
      // User cancellations are common; only show error for real failures
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
        'inline-flex items-center gap-1 rounded text-xs underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      }
      type="button"
      aria-label="공유하기"
      onClick={handleShare}
      disabled={sharing}
    >
      <Share2 className="h-4 w-4" aria-hidden="true" /> Share
    </button>
  );
}
