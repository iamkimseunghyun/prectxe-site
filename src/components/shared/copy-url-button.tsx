'use client';

import { Link } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from '@/hooks/use-toast';

type Props = {
  className?: string;
};

export function CopyUrlButton({ className }: Props) {
  const [copying, setCopying] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      setCopying(true);
      const url = typeof window !== 'undefined' ? window.location.href : '';

      await navigator.clipboard.writeText(url);
      toast({
        title: '링크 복사됨',
        description: '현재 페이지 URL을 클립보드에 복사했습니다.',
      });
    } catch (_err) {
      toast({
        title: '복사 실패',
        description: '링크 복사에 실패했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    } finally {
      setCopying(false);
    }
  }, []);

  return (
    <button
      className={
        className ??
        'inline-flex items-center text-xs text-neutral-400 transition-colors hover:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      }
      type="button"
      aria-label="링크 복사"
      onClick={handleCopy}
      disabled={copying}
    >
      <Link className="h-4 w-4" />
    </button>
  );
}
