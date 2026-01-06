'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
}: AdminPaginationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    return `${pathname}?${params.toString()}`;
  };

  const pages: (number | 'ellipsis')[] = [];

  // Always show first page
  pages.push(1);

  // Show ellipsis if needed
  if (currentPage > 3) {
    pages.push('ellipsis');
  }

  // Show pages around current page
  for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
    pages.push(i);
  }

  // Show ellipsis if needed
  if (currentPage < totalPages - 2) {
    pages.push('ellipsis');
  }

  // Always show last page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between border-t px-4 py-3">
      <div className="text-sm text-muted-foreground">
        총 {totalItems}개 항목
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={currentPage === 1}
        >
          {currentPage === 1 ? (
            <span className="cursor-not-allowed opacity-50">이전</span>
          ) : (
            <Link href={createPageUrl(currentPage - 1)}>이전</Link>
          )}
        </Button>

        <div className="flex items-center gap-1">
          {pages.map((page, idx) => {
            if (page === 'ellipsis') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                  ...
                </span>
              );
            }

            const isActive = page === currentPage;

            return (
              <Button
                key={page}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                asChild={!isActive}
                disabled={isActive}
              >
                {isActive ? (
                  <span>{page}</span>
                ) : (
                  <Link href={createPageUrl(page)}>{page}</Link>
                )}
              </Button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          asChild
          disabled={currentPage === totalPages}
        >
          {currentPage === totalPages ? (
            <span className="cursor-not-allowed opacity-50">다음</span>
          ) : (
            <Link href={createPageUrl(currentPage + 1)}>다음</Link>
          )}
        </Button>
      </div>
    </div>
  );
}
