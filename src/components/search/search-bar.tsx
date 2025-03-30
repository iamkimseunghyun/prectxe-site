// components/page/artist/search-bar.tsx
'use client';

import { Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  defaultValue?: string;
  className?: string;
}

export function SearchBar({ defaultValue = '', className }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  // Execute search
  const handleSearch = () => {
    if (!searchTerm.trim()) return;

    startTransition(() => {
      const currentPath = pathname === '/search' ? pathname : '/search';
      router.push(`${currentPath}?q=${encodeURIComponent(searchTerm.trim())}`);
    });
  };

  // Handle Enter key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Clear search input
  const handleClear = () => {
    setSearchTerm('');
    if (pathname === '/search') {
      startTransition(() => {
        router.push('/search');
      });
    }
  };

  return (
    <div
      className={cn(
        'relative flex w-full max-w-md items-center space-x-2',
        className
      )}
    >
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="아티스트, 작품, 이벤트, 프로젝트 등 검색..."
          className={cn(
            'pl-9 pr-10',
            isPending && 'text-muted-foreground opacity-70'
          )}
          disabled={isPending}
        />
        {searchTerm && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={handleClear}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Button onClick={handleSearch} disabled={!searchTerm.trim() || isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '검색'}
      </Button>
    </div>
  );
}
