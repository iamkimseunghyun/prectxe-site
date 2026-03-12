import { DropDetailView } from '@/modules/drops/ui/views/drop-detail-view';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return <DropDetailView dropId={id} />;
}
