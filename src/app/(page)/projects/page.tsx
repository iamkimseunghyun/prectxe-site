import { ProjectListView } from '@/modules/projects/ui/view/project-list-view';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

interface PageProps {
  searchParams: Promise<{
    year?: string;
    category?: string;
    sort?: string;
    search?: string;
  }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const params = await searchParams;
  return <ProjectListView params={params} />;
};

export default Page;
