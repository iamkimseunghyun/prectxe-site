// components/layout/header.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import SearchCommand from '@/components/search/search-command';

export default function Header() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Projects', href: '/projects' },
    { name: 'Admin', href: '/admin' },
  ];

  return (
    <header className="fixed top-0 z-50 h-[var(--header-height)] w-full border-b bg-white/80 backdrop-blur-md">
      <div className="mb-50 container mx-auto px-4">
        <nav className="flex h-16 items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="text-xl font-bold">
            PRECTXE
          </Link>

          {/* 검색 */}
          <div className="hidden md:block">
            <SearchCommand />
          </div>

          {/* 네비게이션 */}
          <ul className="flex items-center gap-8">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'text-sm transition-colors hover:text-black/60',
                    pathname === item.href ? 'text-black' : 'text-black/40'
                  )}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
