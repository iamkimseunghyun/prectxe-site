import { redirect } from 'next/navigation';

const Page = async () => {
  redirect('/programs?status=completed');
};

export default Page;
