'use client';

import { CopyCheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const CopyUrlButton = () => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      // Get the current URL
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);

      // Show success state
      setCopied(true);
      toast({
        title: 'URL이 복사되었습니다',
        description: '클립보드에 URL이 복사되었습니다.',
      });

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      toast({
        title: 'URL 복사 실패',
        description: 'URL을 복사하는데 실패했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      onClick={copyToClipboard}
      variant="ghost"
      size="icon"
      className="h-8 w-8 rounded-full transition-all hover:bg-muted"
      title="URL 복사하기"
      aria-label="URL 복사하기"
    >
      {copied ? (
        <CopyCheckIcon className="h-4 w-4 text-green-500" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
    </Button>
  );
};

export default CopyUrlButton;
