import Link from 'next/link';
import NavBar from '@/components/layout/nav/nav-bar';
import getSession from '@/lib/session';
import canManage from '@/lib/can-manage';
import { prisma } from '@/lib/db/prisma';

const Header = async () => {
  const session = await getSession();

  const canEdit = await canManage(session.id!);

  if (!session.id) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: session.id } });

  if (!user) {
    return null;
  }

  return (
    <header className="fixed top-0 z-50 h-[var(--header-height)] w-full border-b bg-white/80 backdrop-blur-md">
      <div className="mb-50 container mx-auto px-4">
        <nav className="flex h-16 items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="text-xl font-bold">
            PRECTXE
          </Link>
          {/* 네비게이션 */}
          <NavBar canEdit={canEdit} user={user.username!} />
        </nav>
      </div>
    </header>
  );
};

export default Header;
