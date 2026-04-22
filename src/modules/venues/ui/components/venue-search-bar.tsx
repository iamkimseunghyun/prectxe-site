'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function VenueSearchBar({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = value.trim();
    router.push(q ? `/venues?search=${encodeURIComponent(q)}` : '/venues');
  };

  const clear = () => {
    setValue('');
    router.push('/venues');
  };

  return (
    <form onSubmit={submit} aria-label="장소 검색">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
        />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="장소 이름 또는 도시 검색"
          aria-label="장소 검색"
          className="h-12 w-full rounded-full border border-neutral-200 bg-transparent pl-11 pr-11 text-sm tracking-tight text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="검색어 지우기"
            className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </form>
  );
}
