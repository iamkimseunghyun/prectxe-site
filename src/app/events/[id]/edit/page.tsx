import { prisma } from '@/lib/db/prisma';
import { getEventById } from '@/app/events/actions';
import { notFound } from 'next/navigation';
import { EventFormWrapper } from '@/components/page/event/event-form-wrapper';

const Page = async ({ params }: { params: { id: string } }) => {
  const id = (await params).id;

  const [eventResult, venues, artists] = await Promise.all([
    getEventById(id),
    prisma.venue.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.artist.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  if (!eventResult.data) {
    notFound();
  }

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold">이벤트 수정</h1>
      <EventFormWrapper venues={venues} artists={artists} mode={'edit'} />
    </div>
  );
};
export default Page;
