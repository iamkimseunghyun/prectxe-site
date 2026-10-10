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
  // /programs?type=live 같은 필터 주소가 별개 페이지로 색인되지 않도록 기준 주소를 하나로 고정
  alternates: { canonical: '/programs' },
};

export default Page;
