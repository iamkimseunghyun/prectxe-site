import { notFound } from 'next/navigation';
import { getDropBySlug } from '@/modules/drops/server/actions';
import { GoodsDropDetailView } from '@/modules/drops/ui/views/goods-drop-detail-view';
import { TicketDropDetailView } from '@/modules/drops/ui/views/ticket-drop-detail-view';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const drop = await getDropBySlug(slug);

  if (!drop || drop.status === 'draft') {
    notFound();
  }

  if (drop.type === 'ticket') {
    return <TicketDropDetailView drop={drop} />;
  }

  return <GoodsDropDetailView drop={drop} />;
}
