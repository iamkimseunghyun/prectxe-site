import Link from 'next/link';
import NavBar from '@/components/layout/nav/nav-bar';
import getSession from '@/lib/session';
import canManage from '@/lib/can-manage';
import { prisma } from '@/lib/db/prisma';

const Header = async () => {
  const session = await getSession();
  let username = '';
  let canEdit = false;
  const isLoggedIn = !!session?.id;

  // 로그인한 경우에만 추가 정보 가져오기
  if (isLoggedIn) {
    try {
      // 병렬로 권한 확인과 사용자 정보 가져오기
      const [canManageResult, user] = await Promise.all([
        canManage(session.id as string),
        prisma.user.findUnique({ where: { id: session.id } }),
      ]);

      canEdit = canManageResult;
      if (user?.username) {
        username = user.username;
      }
    } catch (error) {
      console.error('사용자 정보 조회 오류:', error);
    }
  }

  async function handleLogout() {
    'use server';
    const session = await getSession();
    session.destroy();
  }

  return (
    <header className="fixed top-0 z-50 h-[var(--header-height)] w-full border-b bg-white/80 backdrop-blur-md">
      <div className="mb-50 container mx-auto px-4">
        <nav className="flex h-16 items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="text-xl font-bold">
            PRECTXE
          </Link>
          {/* 네비게이션 - 로그인 여부와 관계없이 항상 표시 */}
          <NavBar
            isLoggedIn={isLoggedIn}
            canEdit={canEdit}
            user={username}
            logout={handleLogout}
          />
        </nav>
      </div>
    </header>
  );
};

export default Header;
