import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { prisma } from '@/lib/db/prisma';

const EventSection = async () => {
  const events = await prisma.event.findMany({
    select: {
      title: true,
      subtitle: true,
      startDate: true,
      mainImageUrl: true,
      id: true,
    },
    take: 3,
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
              className="group relative overflow-hidden rounded-lg"
            >
              <div className="relative aspect-square overflow-hidden">
                {event.mainImageUrl ? (
                  <Image
                    src={`${event.mainImageUrl}/smaller`}
                    alt={event.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gray-100">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/70 to-black/0 p-6 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                <p className="text-sm font-medium text-gray-200">
                  {event.startDate.getFullYear()}
                </p>
                <h3 className="mt-2 text-xl font-bold leading-tight">
                  {event.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-sm text-gray-200">
                  {event.subtitle}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default EventSection;
