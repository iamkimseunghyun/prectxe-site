'use client';

import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { useSignOutMutation } from '@/hooks/use-sign-out-mutation';

/**
 * 미니멀 헤더 - 관리자 전용
 * 일반 네비게이션은 푸터에서 제공
 */
const Header = () => {
  const { user, isLoggedIn, isAdmin, isLoading } = useSession();
  const logoutMutation = useSignOutMutation();

  // 로딩 중이거나 관리자가 아니면 아무것도 표시하지 않음
  if (isLoading || !isLoggedIn || !isAdmin) {
    return null;
  }

  return (
    <header className="fixed right-4 top-4 z-50">
      <div className="flex items-center gap-3 rounded-full bg-neutral-900/90 px-4 py-2 text-sm backdrop-blur-sm">
        <Link
          href="/admin"
          className="text-neutral-300 transition-colors hover:text-white"
        >
          Admin
        </Link>
        <span className="text-neutral-600">·</span>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-300 transition-colors hover:text-white"
        >
          홈
        </a>
        <span className="text-neutral-600">·</span>
        <span className="text-neutral-400">{user?.username}</span>
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="text-neutral-500 transition-colors hover:text-neutral-300"
        >
          {logoutMutation.isPending ? '...' : 'Logout'}
        </button>
      </div>
    </header>
  );
};

export default Header;
