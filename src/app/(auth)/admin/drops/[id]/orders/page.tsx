import { DropOrdersView } from '@/modules/drops/ui/views/drop-orders-view';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const page = Number(sp.page) || 1;
  return <DropOrdersView dropId={id} page={page} />;
}
