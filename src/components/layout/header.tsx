import NavBar from '@/components/layout/nav/nav-bar';

const Header = () => {
  return (
    <header className="fixed top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
      <div className="container mx-auto">
        <NavBar />
      </div>
    </header>
  );
};

export default Header;
