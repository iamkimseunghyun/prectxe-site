'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import GlobalSearch from '@/modules/home/ui/components/global-search';
import { useSignOutMutation } from '@/hooks/use-sign-out-mutation';
import { useSession } from '@/hooks/use-session';

const NavBar = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { user, isLoggedIn, isAdmin, isLoading, isError } = useSession();

  // 수정 가능 여부 판단 로직
  // 1. 로딩 중에는 버튼을 숨기거나 로딩 상태 표시
  // 2. 로그인 상태여야 함
  // 3. 관리자이거나, 현재 로그인한 사용자가 게시물 작성자여야 함
  const canEdit = !isLoading && isLoggedIn && (isAdmin || user?.id);

  const logoutMutation = useSignOutMutation();

  // 모바일 메뉴 토글
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // 로딩 중 처리
  if (isLoading) {
    // 간단한 로딩 상태 표시 (예: 헤더 높이만 유지)
    return <div className="h-16 w-full"></div>;
  }

  // 에러 처리 (선택 사항: 에러 메시지 표시 또는 기본 UI 표시)
  if (isError) {
    // 에러 발생 시에도 기본 네비게이션은 보여줄 수 있음
    console.error('Failed to load session data');
  }

  // 기본 공개 네비게이션 항목
  const publicNavigation = [
    { name: 'Home', href: '/' },
    { name: 'Archive', href: '/programs' },
    { name: 'Journal', href: '/journal' },
    { name: 'About', href: '/about' },
  ];

  // 로그인 여부와 권한에 따른 네비게이션 항목 구성
  const navigation = [...publicNavigation];

  // 관리자인 경우 관리자 메뉴 추가
  if (canEdit) {
    navigation.push({ name: 'Admin', href: '/admin' });
  }

  return (
    <div className="w-full">
      {/* 데스크탑 네비게이션 */}
      <div className="hidden md:block">
        <div className="flex h-16 items-center justify-between px-4">
          {/* 로고 영역 */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold">
              PRECTXE
            </Link>
          </div>

          {/* 네비게이션 메뉴 */}
          <div className="flex items-center">
            <nav className="mx-auto flex">
              <ul className="flex space-x-8">
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

          {/* 우측 영역: 검색 및 사용자 메뉴 */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <GlobalSearch />
            </div>

            {isLoggedIn && user ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/admin"
                  className={cn(
                    'text-sm font-medium transition-colors hover:text-purple-600',
                    pathname.startsWith('/admin')
                      ? 'text-purple-700'
                      : 'text-purple-500'
                  )}
                >
                  {user.username}
                </Link>
                <button
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-100"
                >
                  {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 모바일 네비게이션 */}
      <div className="md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          {/* 모바일 로고 */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold">
              PRECTXE
            </Link>
          </div>

          {/* 모바일 우측 영역: 검색 및 메뉴 */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              <GlobalSearch />
            </div>

            <button
              onClick={toggleMenu}
              className="relative z-[60] ml-2 p-2 text-black/40 focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X size={24} className="text-blue-200" />
              ) : (
                <Menu size={24} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 슬라이드 패널 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed left-0 top-0 z-50 w-full rounded-b-sm bg-black pb-16 pt-16 shadow-lg md:hidden"
            initial={{ y: '-100%' }}
            animate={{ y: isMenuOpen ? '0%' : '-100%' }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <ul className="flex flex-col items-center justify-center space-y-6 px-6">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'block py-2 text-3xl font-medium transition-colors',
                      pathname === item.href
                        ? 'text-blue-200'
                        : 'text-blue-500/60'
                    )}
                    onClick={() => setIsMenuOpen(false)} // Close menu when item is clicked
                  >
                    {item.name}
                  </Link>
                </li>
              ))}

              {/* 사용자 메뉴 모바일 뷰 */}
              {isLoggedIn && user && (
                <li className="mt-4 border-t border-gray-700 pt-4">
                  <button
                    onClick={() => {
                      logoutMutation.mutate();
                      setIsMenuOpen(false);
                    }}
                    disabled={logoutMutation.isPending}
                    className="rounded-md bg-red-900/30 px-4 py-2 text-base text-red-300 transition-colors hover:bg-red-900/50"
                  >
                    {logoutMutation.isPending
                      ? '로그아웃 중...'
                      : `${user.username} 로그아웃`}
                  </button>
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NavBar;
