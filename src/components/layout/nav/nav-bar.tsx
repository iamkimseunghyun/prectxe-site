'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface NavBarProps {
  canEdit?: boolean;
  user?: string;
  isLoggedIn?: boolean;
  logout?: () => void;
}
const NavBar = ({
  canEdit = false,
  user = '',
  isLoggedIn = false,
  logout,
}: NavBarProps) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [localCanEdit, setLocalCanEdit] = useState(canEdit);

  // canEdit prop이 변경될 때 localCanEdit 업데이트
  useEffect(() => {
    setLocalCanEdit(canEdit);
  }, [canEdit]);

  // 모바일 메뉴 토글
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

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
  if (localCanEdit) {
    navigation.push({ name: 'Admin', href: '/admin' });
  }

  return (
    <nav className="relative">
      {/* 데스크탑 네비게이션 */}
      <div className="hidden items-center gap-4 md:flex">
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
                <button
                  onClick={logout}
                  className="rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-100"
                >
                  로그아웃
                </button>
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

      {/* 모바일 네비게이션 햄버거 아이콘 */}
      <div className="flex justify-end md:hidden">
        <button
          onClick={toggleMenu}
          className="relative z-[60] p-2 text-black focus:outline-none"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* 모바일 메뉴 슬라이드 패널 */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="fixed left-0 top-0 z-50 w-full rounded-b-lg bg-blue-800 pb-16 pt-16 shadow-lg md:hidden"
            // style={{ height: '80vh' }}
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
                      'block py-2 text-3xl font-medium transition-colors hover:text-blue-500/60',
                      pathname === item.href
                        ? 'text-blue-200'
                        : 'text-blue-300/40'
                    )}
                    onClick={() => setIsMenuOpen(false)} // Close menu when item is clicked
                  >
                    {item.name}
                  </Link>
                </li>
              ))}

              {/* 사용자 메뉴 모바일 뷰 */}
              {isLoggedIn && (
                <>
                  <li className="mt-4 border-t border-gray-100 pt-4">
                    <Link
                      href="/profile"
                      className={cn(
                        'block py-2 text-base font-medium transition-colors hover:text-purple-600',
                        pathname === '/profile'
                          ? 'text-purple-700'
                          : 'text-purple-500'
                      )}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {user || '프로필'}
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        if (logout) logout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full rounded-md bg-red-50 px-3 py-1.5 text-left text-sm text-red-600 transition-colors hover:bg-red-100"
                    >
                      로그아웃
                    </button>
                  </li>
                </>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
export default NavBar;
