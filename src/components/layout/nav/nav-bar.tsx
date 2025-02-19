'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
interface NavBarProps {
  canEdit?: boolean;
  user?: string;
  isLoggedIn?: boolean;
}
const NavBar = ({
  canEdit = false,
  user = '',
  isLoggedIn = false,
}: NavBarProps) => {
  const pathname = usePathname();

  // 기본 공개 네비게이션 항목
  const publicNavigation = [
    { name: 'Home', href: '/' },
    { name: 'Events', href: '/events' },
    { name: 'Projects', href: '/projects' },
    { name: 'Artists', href: '/artists' },
    { name: 'Artworks', href: '/artworks' },
    // { name: 'Venues', href: '/venues' },
  ];

  // 로그인 여부와 권한에 따른 네비게이션 항목 구성
  const navigation = [...publicNavigation];

  // 관리자인 경우 관리자 메뉴 추가
  if (canEdit) {
    navigation.push({ name: 'Admin', href: '/admin' });
  }

  return (
    <div className="flex items-center gap-4">
      {/* 메인 네비게이션 */}
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

      {/* 사용자 메뉴 영역 */}
      <div className="ml-4 flex items-center gap-4">
        {
          isLoggedIn ? (
            <>
              {/* 로그인한 경우 사용자 정보와 로그아웃 링크 표시 */}
              <Link
                href="/profile"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-purple-600',
                  pathname === '/profile'
                    ? 'text-purple-700'
                    : 'text-purple-500'
                )}
              >
                {user || '프로필'}
              </Link>
              <Link
                href="/api/auth/signout"
                className="rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-100"
              >
                로그아웃
              </Link>
            </>
          ) : null
          /* 로그인하지 않은 경우 로그인 링크 표시 */
          // <Link
          //   href="/auth/signin"
          //   className="rounded-md bg-blue-50 px-3 py-1.5 text-sm text-blue-600 transition-colors hover:bg-blue-100"
          // >
          //   로그인
          // </Link>
        }
      </div>
    </div>
  );
};
export default NavBar;
