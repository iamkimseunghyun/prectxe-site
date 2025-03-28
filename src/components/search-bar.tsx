// components/page/artist/search-bar.tsx
'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

export function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get('search') ?? ''
  );
  const [isPending, startTransition] = useTransition();

  // 검색 실행 함수
  const executeSearch = async () => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm.trim()) {
      params.set('search', searchTerm.trim());
    } else {
      params.delete('search');
    }
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  // 엔터 키 처리
  // 수정된 코드
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch();
    }
  };
  // 검색어 초기화
  const handleClear = () => {
    setSearchTerm('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="relative w-full max-w-sm">
      <Search
        className={`absolute left-3 top-3 h-4 w-4 ${isPending ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}
      />
      <Input
        placeholder="검색어를 입력하세요."
        className={`pl-9 pr-10 transition-opacity ${
          isPending ? 'opacity-70' : 'opacity-100'
        }`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isPending}
      />
      {searchTerm && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0"
          onClick={handleClear}
          disabled={isPending}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
