import { notFound, redirect } from 'next/navigation';
import getSession from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { getDropGuests } from '@/modules/tickets/server/queries';
import { GuestListView } from '@/modules/tickets/ui/admin/guest-list-view';

export default async function GuestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // 미들웨어와 별개로 페이지에서도 어드민을 확인한다 — 게스트 연락처가 보인다
  const session = await getSession();
  if (!session.id || !session.isAdmin) redirect('/auth/signin');

  const { id } = await params;
  const drop = await prisma.drop.findUnique({
    where: { id },
    select: { id: true, title: true, type: true },
  });
  if (!drop || drop.type !== 'ticket') notFound();

  const guests = await getDropGuests(id);
  return <GuestListView drop={drop} guests={guests} />;
}
