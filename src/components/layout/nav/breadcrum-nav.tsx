import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import CopyUrlButton from '@/components/layout/nav/copy-url-button';
import { type EntityType, ROUTE_CONFIG } from '@/lib/route-config';

interface BreadcrumbNavProps {
  entityType: EntityType;
  title: string;
}

const BreadcrumbNav = ({ entityType, title }: BreadcrumbNavProps) => {
  const config = ROUTE_CONFIG[entityType];

  return (
    // 이전에는 `hidden sm:block`이라 모바일에서 통째로 사라져
    // "목록으로 돌아가기" 동선 자체가 없었다.
    <nav aria-label="현재 위치" className="mb-4 sm:mb-6">
      <ol className="flex list-none items-center gap-2 text-sm text-muted-foreground">
        <li>
          <Link
            href={`/${config.path}`}
            className="rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            {config.displayName}
          </Link>
        </li>
        <li aria-hidden className="flex items-center">
          <ChevronRight className="h-4 w-4" />
        </li>
        <li className="flex min-w-0 items-center gap-1">
          {/* 현재 페이지는 링크가 아니므로 hover 스타일을 주지 않는다 */}
          <span aria-current="page" className="truncate">
            {title}
          </span>
          <CopyUrlButton />
        </li>
      </ol>
    </nav>
  );
};

export default BreadcrumbNav;
