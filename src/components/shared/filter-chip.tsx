import Link from 'next/link';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
}

/**
 * 리스트 페이지 상단 필터용 공통 칩.
 * border + pill shape, active 시 solid invert.
 */
export function FilterChip({ href, active, children }: FilterChipProps) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-4 py-1.5 text-sm transition-colors',
        active
          ? 'border-neutral-900 bg-neutral-900 text-white'
          : 'border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900'
      )}
    >
      {children}
    </Link>
  );
}
