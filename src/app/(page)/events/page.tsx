import { redirect } from 'next/navigation';

const Page = async () => {
  redirect('/programs?status=upcoming');
};

export default Page;
