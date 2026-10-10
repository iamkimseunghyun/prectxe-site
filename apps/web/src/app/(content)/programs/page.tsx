import { ProgramsView } from '@/modules/programs/ui/views/programs-view';

interface PageProps {
  searchParams: Promise<{ type?: string }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  return <ProgramsView params={params} />;
};

export const metadata = {
  title: 'Archive — PRECTXE',
  description: 'PRECTXE가 선보인 지난 프로그램의 기록.',
};

export default Page;
