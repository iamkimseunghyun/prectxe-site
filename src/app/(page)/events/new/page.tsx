import { prisma } from '@/lib/db/prisma';
import getSession from '@/lib/auth/session';
import { EventFormView } from '@/modules/events/ui/views/event-form-view';

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
    <div className="mx-auto px-4 py-6 sm:max-w-5xl sm:px-12">
      <h1 className="mb-6 text-3xl font-bold">새 이벤트 등록</h1>
      <EventFormView
        mode={'create'}
        venues={venues}
        artists={artists}
        userId={session.id}
      />
    </div>
  );
};

export default Page;
