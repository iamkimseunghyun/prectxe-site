'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * 풀스크린 오버레이 네비 — 잡지 마스트헤드 + 에디토리얼 인덱스 문법.
 * 평소: PRECTXE 로고(좌) · MENU 버튼(우) 얇은 탑 바
 * 클릭: 검정 오버레이 + 거대한 타이포 네비 + 섹션 구분
 */
const CURATION = [
  { href: '/drops', label: 'Drops' },
  { href: '/programs', label: 'Programs' },
  { href: '/journal', label: 'Journal' },
];

const DIRECTORY = [
  { href: '/artists', label: 'Artists' },
  { href: '/venues', label: 'Venues' },
  { href: '/artworks', label: 'Artworks' },
];

const META = [{ href: '/about', label: 'About' }];

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 경로 변경 시 오버레이 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape + body scroll 잠금
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/auth')) {
    return null;
  }

  const isDarkOver = open;

  return (
    <>
      {/* Top bar — 로고 + MENU/CLOSE 텍스트 버튼만 */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
          isDarkOver
            ? 'bg-transparent'
            : scrolled
              ? 'border-b border-neutral-200/80 bg-white/85 backdrop-blur-md'
              : 'bg-transparent'
        )}
      >
        <div
          className={cn(
            'mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-5 md:px-12 md:py-6 lg:px-24',
            isDarkOver ? 'text-white' : 'text-neutral-900'
          )}
        >
          <Link
            href="/"
            aria-label="PRECTXE 홈으로"
            className="text-sm font-light tracking-[0.25em] md:text-base"
          >
            PRECTXE
          </Link>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="site-nav"
            className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.25em] transition-opacity hover:opacity-60"
          >
            <span
              aria-hidden
              className={cn(
                'inline-block h-px bg-current transition-all duration-200',
                open ? 'w-3' : 'w-6'
              )}
            />
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
      </header>

      {/* Overlay 네비 */}
      <div
        id="site-nav"
        aria-hidden={!open}
        className={cn(
          'fixed inset-0 z-40 flex flex-col bg-neutral-950 text-white transition-[opacity,visibility] duration-300',
          open ? 'visible opacity-100' : 'invisible opacity-0'
        )}
      >
        <div
          className={cn(
            'mx-auto flex h-full w-full max-w-screen-2xl flex-1 flex-col px-6 pt-28 pb-12 transition-transform duration-300 md:px-12 md:pt-36 md:pb-16 lg:px-24',
            open ? 'translate-y-0' : '-translate-y-4'
          )}
        >
          {/* 네비 인덱스 — 잡지 목차 스타일 */}
          <nav className="flex flex-1 flex-col">
            <div className="grid flex-1 gap-10 md:grid-cols-2 md:gap-16 lg:gap-24">
              <NavColumn
                eyebrow="Curation"
                items={CURATION}
                pathname={pathname}
              />
              <NavColumn
                eyebrow="Directory"
                items={DIRECTORY}
                pathname={pathname}
              />
            </div>

            <div className="mt-10 flex items-end justify-between border-t border-white/10 pt-8 md:mt-14">
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {META.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/40">
                Music and Art, curated.
              </p>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}

function NavColumn({
  eyebrow,
  items,
  pathname,
}: {
  eyebrow: string;
  items: { href: string; label: string }[];
  pathname: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/40">
        {eyebrow}
      </p>
      <ul className="space-y-2 md:space-y-3">
        {items.map((l, i) => {
          const active = pathname?.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                className={cn(
                  'group flex items-baseline gap-4 text-4xl font-light leading-[1] tracking-tight transition-colors md:text-6xl lg:text-7xl',
                  active ? 'text-white' : 'text-white/50 hover:text-white'
                )}
              >
                <span
                  aria-hidden
                  className="text-[10px] font-medium tabular-nums tracking-[0.2em] text-white/30 group-hover:text-white/60"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
