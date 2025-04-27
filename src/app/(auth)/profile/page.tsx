import { makeLogout } from '@/lib/auth/make-login';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';

const Page = () => {
  const handleLogout = async () => {
    'use server';
    await makeLogout();
    redirect('/');
  };
  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center">
      <div className="absolute right-8 top-20 flex flex-col items-center justify-center gap-3">
        <h1>User Profile</h1>
        <form action={handleLogout}>
          <Button>로그아웃</Button>
        </form>
      </div>
    </div>
  );
};

export default Page;
