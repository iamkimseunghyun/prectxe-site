'use client';

import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/drops', label: 'Drops' },
  { href: '/programs', label: 'Programs' },
  { href: '/journal', label: 'Journal' },
  { href: '/partnership', label: 'Partnership' },
  { href: '/about', label: 'About' },
];

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // /admin, /auth 경로는 퍼블릭 헤더 숨김
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/auth')) {
    return null;
  }

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-200',
        scrolled
          ? 'border-b border-neutral-200/80 bg-white/85 backdrop-blur-md'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-6 py-4 md:px-12 lg:px-24">
        <Link
          href="/"
          className="text-sm font-medium tracking-[0.2em] text-neutral-900"
          aria-label="PRECTXE 홈으로"
        >
          PRECTXE
        </Link>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV_LINKS.map((l) => {
              const active =
                l.href === '/'
                  ? pathname === '/'
                  : pathname?.startsWith(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={cn(
                      'text-sm transition-colors',
                      active
                        ? 'text-neutral-900'
                        : 'text-neutral-500 hover:text-neutral-900'
                    )}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? '메뉴 닫기' : '메뉴 열기'}
          className="-mr-2 flex h-10 w-10 items-center justify-center text-neutral-900 md:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* 모바일 드로어 */}
      {mobileOpen && (
        <div className="border-t border-neutral-200 bg-white md:hidden">
          <nav>
            <ul className="flex flex-col divide-y divide-neutral-100 px-6">
              {NAV_LINKS.map((l) => {
                const active =
                  l.href === '/'
                    ? pathname === '/'
                    : pathname?.startsWith(l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={cn(
                        'block py-4 text-base transition-colors',
                        active ? 'text-neutral-900' : 'text-neutral-600'
                      )}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
