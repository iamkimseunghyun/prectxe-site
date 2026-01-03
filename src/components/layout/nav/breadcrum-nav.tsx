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
    <div className="mb-2 hidden items-center justify-start sm:mb-6 sm:block">
      <nav className="flex items-center text-sm text-muted-foreground">
        <Link href={`/${config.path}`} className="hover:text-foreground">
          {config.displayName}
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <span className="hover:text-foreground">{title}</span>
        <span className="text-muted-foreground">
          <CopyUrlButton />
        </span>
      </nav>
    </div>
  );
};

export default BreadcrumbNav;
