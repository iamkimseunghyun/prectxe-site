'use client';

import { LayoutGrid, List } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

const VIEW_OPTIONS = [
  { value: 'card', label: '카드', icon: LayoutGrid },
  { value: 'list', label: '리스트', icon: List },
] as const;

export function FormViewToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeView = searchParams.get('view') ?? 'card';

  const handleViewChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === 'card') {
      params.delete('view');
    } else {
      params.set('view', value);
    }
    const qs = params.toString();
    router.replace(`/admin/forms${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-md border p-1">
      {VIEW_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isActive = activeView === opt.value;
        return (
          <Button
            key={opt.value}
            size="sm"
            variant={isActive ? 'default' : 'ghost'}
            onClick={() => handleViewChange(opt.value)}
            className="h-7 gap-1.5 px-2"
          >
            <Icon className="h-4 w-4" />
            <span className="text-xs">{opt.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
