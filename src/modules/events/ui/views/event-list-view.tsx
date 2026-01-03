import Image from 'next/image';
import Link from 'next/link';
import { formatDate, getImageUrl } from '@/lib/utils';
import { getEventsByArtistId } from '@/modules/events/server/actions';

const EventListView = async ({ artistId }: { artistId: string }) => {
  const events = await getEventsByArtistId(artistId);
  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        등록된 이벤트가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <Link key={event.id} href={`/events/${event.id}`}>
          <div className="group relative aspect-square overflow-hidden rounded-lg">
            <Image
              src={
                `${getImageUrl(event.mainImageUrl, 'smaller')}` ||
                '/api/placeholder/400/400'
              }
              alt={event.title}
              fill
              priority
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              placeholder="blur"
              blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute bottom-0 p-4 text-white">
                <h3 className="font-medium">{event.title}</h3>
                <p className="text-sm">
                  {formatDate(new Date(event.createdAt))}
                </p>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default EventListView;
