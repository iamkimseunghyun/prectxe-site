import { DropsListView } from '@/modules/drops/ui/views/drops-list-view';

interface PageProps {
  searchParams: Promise<{ type?: string; page?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const type = params.type as 'ticket' | 'goods' | undefined;
  const page = Number(params.page) || 1;
  return <DropsListView type={type} page={page} />;
}
