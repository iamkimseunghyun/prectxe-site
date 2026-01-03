import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface AdminHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function AdminHeader({
  title,
  description,
  actionLabel,
  actionHref,
}: AdminHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        </Link>
      )}
    </div>
  );
}
