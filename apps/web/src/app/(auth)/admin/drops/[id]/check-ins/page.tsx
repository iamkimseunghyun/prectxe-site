import { notFound, redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getDropCheckInLog } from '@/modules/tickets/server/queries';
import { CheckInLogView } from '@/modules/tickets/ui/views/check-in-log-view';

export default async function CheckInLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 미들웨어와 별개로 페이지에서도 어드민을 확인한다 — 관객 이름·주문번호가 보인다
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const { id } = await params;
  const drop = await prisma.drop.findUnique({
    where: { id },
    select: { id: true, title: true, type: true },
  });
  if (!drop || drop.type !== 'ticket') notFound();

  const { entries, truncated } = await getDropCheckInLog(id);
  return <CheckInLogView drop={drop} entries={entries} truncated={truncated} />;
}
