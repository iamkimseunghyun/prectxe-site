import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/prisma';
import { TicketDashboardView } from '@/modules/tickets/ui/views/ticket-dashboard-view';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await prisma.program.findUnique({
    where: { id },
    select: { id: true, title: true, ticketingEnabled: true },
  });

  if (!program) redirect('/admin/programs');

  return (
    <TicketDashboardView
      programId={program.id}
      programTitle={program.title}
      ticketingEnabled={program.ticketingEnabled}
    />
  );
}
