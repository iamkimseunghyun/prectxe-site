import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

/**
 * 리스트 페이지 상단 필터용 공통 칩.
 * border 없는 solid pill, active 시 invert.
 */
export function FilterChip({ href, active, children }: FilterChipProps) {
  return (
    <Link
      href={href}
      // 색으로만 표시하면 스크린리더가 현재 필터를 알 수 없다
      aria-current={active ? 'true' : undefined}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-neutral-900 text-white'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      )}
    >
      {children}
    </Link>
  );
}
