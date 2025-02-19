import getSession from '@/lib/session';

const Page = async () => {
  const session = await getSession();
  if (!session) return null;

  const handleLogout = async () => {
    session.destroy();
  };

  return (
    <div>
      <h1>User Profile</h1>
      <div>
        Logout
        <button onClick={handleLogout}>로그아웃</button>
      </div>
    </div>
  );
};

export default Page;
