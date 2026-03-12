'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function BackButton({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => router.back()}
      className={cn(
        'sticky left-0 top-12 z-30 mb-4 hidden w-fit rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:shadow-md md:flex',
        className
      )}
      aria-label="뒤로 가기"
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );
}
