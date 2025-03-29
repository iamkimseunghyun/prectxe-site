import { prisma } from '@/lib/db/prisma';
import { EventForm } from '@/components/page/event/event-form';
import getSession from '@/lib/session';

const Page = async () => {
  const session = await getSession();

  if (!session.id) {
    return null;
  }
  const [venues, artists] = await Promise.all([
    prisma.venue.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
    prisma.artist.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    }),
  ]);

  return (
    <div className="container mx-auto px-12 py-6">
      <h1 className="mb-6 text-3xl font-bold">새 이벤트 등록</h1>
      <EventForm
        mode={'create'}
        venues={venues}
        artists={artists}
        userId={session.id}
      />
    </div>
  );
};

export default Page;
