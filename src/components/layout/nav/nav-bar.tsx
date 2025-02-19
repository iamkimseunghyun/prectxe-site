'use client';

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

const NavBar = ({ canEdit, user }: { canEdit: boolean; user?: string }) => {
  const pathname = usePathname();

  const publicNavigation = [
    { name: 'Home', href: '/' },
    { name: 'Projects', href: '/projects' },
  ];

  const navigation = canEdit
    ? [...publicNavigation, { name: 'Admin', href: '/admin' }]
    : publicNavigation;

  return (
    <div>
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
      {/* 관리자 메뉴 */}
      {user ? <p>{user}!!!!</p> : 'no username'}
    </div>
  );
};
export default NavBar;
