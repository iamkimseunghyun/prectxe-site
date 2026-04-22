import { ProgramsView } from '@/modules/programs/ui/views/programs-view';

interface PageProps {
  searchParams: Promise<{ status?: string; type?: string; city?: string }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  return <ProgramsView params={params} />;
};

export const metadata = {
  title: 'Programs — PRECTXE',
  description: '다가오는 이벤트와 지난 프로그램 아카이브.',
};

export default Page;
