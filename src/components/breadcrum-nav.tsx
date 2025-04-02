import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EntityType, ROUTE_CONFIG } from '@/lib/route-config';
import CopyUrlButton from '@/components/copy-url-button';

interface BreadcrumbNavProps {
  entityType: EntityType;
  title: string;
}

const BreadcrumbNav = ({ entityType, title }: BreadcrumbNavProps) => {
  const config = ROUTE_CONFIG[entityType];

  return (
    <div className="mb-6 flex items-center justify-between">
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link href={`/${config.path}`} className="hover:text-foreground">
          {config.displayName}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{title}</span>
        <CopyUrlButton />
      </nav>
    </div>
  );
};

export default BreadcrumbNav;
