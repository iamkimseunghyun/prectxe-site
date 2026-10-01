import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { TicketScannerView } from '@/modules/tickets/ui/views/ticket-scanner-view';

export default async function ScannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const drop = await prisma.drop.findUnique({
    where: { id },
    select: { id: true, title: true },
  });
  if (!drop) notFound();

  return <TicketScannerView dropId={drop.id} dropTitle={drop.title} />;
}
