import Link from 'next/link';
import NavBar from '@/components/layout/nav/nav-bar';
import getSession from '@/lib/session';
import canManage from '@/lib/can-manage';

const Header = async () => {
  const session = await getSession();

  const canEdit = await canManage(session.id!);

  return (
    <header className="fixed top-0 z-50 h-[var(--header-height)] w-full border-b bg-white/80 backdrop-blur-md">
      <div className="mb-50 container mx-auto px-4">
        <nav className="flex h-16 items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="text-xl font-bold">
            PRECTXE
          </Link>
          {/* 네비게이션 */}
          <NavBar canEdit={canEdit} />
        </nav>
      </div>
    </header>
  );
};

export default Header;
