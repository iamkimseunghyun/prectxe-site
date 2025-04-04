import { prisma } from '@/lib/db/prisma';
import { getEventById } from '@/app/(page)/events/actions';
import { notFound } from 'next/navigation';
import { EventForm } from '@/components/page/event/event-form';
import getSession from '@/lib/session';

import { Event } from '@/lib/schemas';

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const id = (await params).id;
  const session = await getSession();
  if (!session.id) {
    return null;
  }
  const [eventData, venues, artists] = await Promise.all([
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

  if (!eventData.data) {
    notFound();
  }

  // EventFormType에 맞는 안전한 초기 데이터 생성
  const initialFormData: Event = {
    title: eventData.data.title || '',
    subtitle: eventData.data.subtitle || '',
    description: eventData.data.description || '',
    type: eventData.data.type || 'exhibition',
    status: eventData.data.status || 'upcoming',
    startDate: eventData.data.startDate || new Date().toISOString(),
    endDate: eventData.data.endDate || new Date().toISOString(),
    mainImageUrl: eventData.data.mainImageUrl || '',
    venueId: eventData.data.venue?.id || '',
    // organizers 배열 안전하게 변환
    organizers: Array.isArray(eventData.data.organizers)
      ? eventData.data.organizers.map((org) => ({
          artistId: org.artist?.id || '',
          role: org.role || '',
        }))
      : [],
    // tickets 배열 안전하게 변환
    tickets: Array.isArray(eventData.data.tickets)
      ? eventData.data.tickets.map((ticket) => ({
          name: ticket.name || '',
          price: Number(ticket.price) || 0,
          quantity: Number(ticket.quantity) || 1,
        }))
      : [],
  };

  return (
    <div className="mx-auto px-4 py-6 sm:max-w-5xl sm:px-12">
      <h1 className="mb-6 text-3xl font-bold">이벤트 수정</h1>
      <EventForm
        mode={'edit'}
        initialData={initialFormData}
        venues={venues}
        artists={artists}
        userId={session.id}
        eventId={id}
      />
    </div>
  );
};
export default Page;
