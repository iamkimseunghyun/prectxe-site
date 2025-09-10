import { ProgramsView } from '@/modules/programs/ui/views/programs-view';

interface PageProps {
  searchParams: Promise<{ status?: string; type?: string; city?: string }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  return <ProgramsView params={params} />;
};

export const metadata = {
  title: 'Archive — PRECTXE',
  description: '완료된 프로그램 아카이브를 탐색하세요.',
};

export default Page;
