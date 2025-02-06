import Link from 'next/link';
import NavBar from '@/components/layout/nav/nav-bar';
import getSession from '@/lib/session';

const Header = async () => {
  const session = await getSession();

  return (
    <header className="fixed top-0 z-50 h-[var(--header-height)] w-full border-b bg-white/80 backdrop-blur-md">
      <div className="mb-50 container mx-auto px-4">
        <nav className="flex h-16 items-center justify-between">
          {/* 로고 */}
          <Link href="/" className="text-xl font-bold">
            PRECTXE
          </Link>
          {/* 네비게이션 */}
          <NavBar sessionId={session?.id} />
        </nav>
      </div>
    </header>
  );
};

export default Header;
