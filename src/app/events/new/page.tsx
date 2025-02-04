import { prisma } from '@/lib/db/prisma';
import { EventForm } from '@/components/page/event/event-form';
import { handleEventSubmit } from '@/app/events/actions';

const Page = async () => {
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
        venues={venues}
        artists={artists}
        onSubmitAction={async (data) => {
          'use server';
          return handleEventSubmit(data, 'create');
        }}
      />
    </div>
  );
};

export default Page;
