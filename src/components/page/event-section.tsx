import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { formatEventDate, isEventBookingClosed } from '@/lib/utils';
import { Calendar, MapPin } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';

const EventSection = async () => {
  const events = await prisma.event.findMany({
    orderBy: {
      startDate: 'desc',
    },
    include: {
      venue: true,
    },
  });
  return (
    <section className="bg-white py-20">
      <div className="container px-4">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-3xl font-bold">Recent Events</h2>
            <p className="mt-2 text-gray-600">
              프렉티스의 다양한 이벤트를 만나보세요.
            </p>
          </div>
          <Link href="/events">
            <Button variant="outline">View All</Button>
          </Link>
        </div>
        {/* 이벤트 그리드 */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-[4/3]">
                {event.mainImageUrl ? (
                  <Image
                    src={`${event.mainImageUrl}/smaller`}
                    alt={event.title}
                    width={200}
                    height={200}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-100">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
                {/* 이벤트 상태 뱃지 */}
                <div className="absolute right-3 top-3">
                  <Badge
                    variant={
                      isEventBookingClosed(event.startDate)
                        ? 'secondary'
                        : 'default'
                    }
                  >
                    {isEventBookingClosed(event.startDate) ? 'CLOSED' : 'OPEN'}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  {formatEventDate(
                    new Date(event.startDate),
                    new Date(event.endDate)
                  )}
                </div>
                <h3 className="mt-4 text-xl font-bold">{event.title}</h3>
                <p className="mt-2 line-clamp-2 flex-1 text-sm text-gray-600">
                  {event.subtitle}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">{event.type}</Badge>
                  {event.venue && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="h-3 w-3" />
                      {event.venue.name}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventSection;
