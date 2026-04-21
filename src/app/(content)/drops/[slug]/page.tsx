import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDropBySlug } from '@/modules/drops/server/actions';
import { GoodsDropDetailView } from '@/modules/drops/ui/views/goods-drop-detail-view';
import { TicketDropDetailView } from '@/modules/drops/ui/views/ticket-drop-detail-view';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const drop = await getDropBySlug(slug);
  if (!drop) return {};

  const title = drop.title;
  const description =
    drop.summary ||
    (drop.type === 'ticket'
      ? `${drop.title} 티켓 — PRECTXE`
      : `${drop.title} — PRECTXE`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      // og:image는 opengraph-image.tsx가 자동 생성
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
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
