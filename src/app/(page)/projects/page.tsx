import { ProjectListView } from '@/modules/projects/ui/views/project-list-view';

export const dynamic = 'force-static';
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
