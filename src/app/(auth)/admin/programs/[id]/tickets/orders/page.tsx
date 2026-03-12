import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { OrdersListView } from '@/modules/tickets/ui/views/orders-list-view';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await prisma.program.findUnique({
    where: { id },
    select: { id: true, title: true },
  });

  if (!program) redirect('/admin/programs');

  return <OrdersListView programId={program.id} programTitle={program.title} />;
}
