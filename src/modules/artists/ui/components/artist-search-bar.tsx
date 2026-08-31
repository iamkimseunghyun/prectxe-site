'use client';

import { Loader2, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

export function ArtistSearchBar({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = (href: string) => {
    startTransition(() => router.push(href));
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = value.trim();
    navigate(q ? `/artists?search=${encodeURIComponent(q)}` : '/artists');
  };

  const clear = () => {
    setValue('');
    navigate('/artists');
    // 지우기 후 포커스가 사라지면 키보드 사용자가 맥락을 잃는다.
    inputRef.current?.focus();
  };

  return (
    // <search>는 암묵적으로 search 랜드마크가 된다.
    // (<form aria-label>만 쓰면 role이 form이라 검색 랜드마크로 안 잡힌다)
    <search aria-label="아티스트 검색">
      <form onSubmit={submit}>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="아티스트 이름 검색"
            aria-label="아티스트 검색"
            maxLength={50}
            className="h-12 w-full rounded-full border border-neutral-200 bg-transparent pl-11 pr-11 text-sm tracking-tight text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          />
          {isPending ? (
            <Loader2
              aria-hidden
              className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400"
            />
          ) : (
            value && (
              <button
                type="button"
                onClick={clear}
                aria-label="검색어 지우기"
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            )
          )}
        </div>
        <p aria-live="polite" className="sr-only">
          {isPending ? '검색 중입니다.' : ''}
        </p>
      </form>
    </search>
  );
}
