import { prisma } from '@/lib/db/prisma';
import { EventFormWrapper } from '@/components/page/event/event-form-wrapper';

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
      <EventFormWrapper venues={venues} artists={artists} mode={'create'} />
    </div>
  );
};

export default Page;
