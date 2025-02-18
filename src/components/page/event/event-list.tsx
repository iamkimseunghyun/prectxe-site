import Link from 'next/link';
import { formatDate, getImageUrl } from '@/lib/utils';
import Image from 'next/image';
import { getEventsByArtistId } from '@/app/events/actions';

const EventList = async ({ artistId }: { artistId: string }) => {
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
        <Link
          key={event.id}
          href={`/events/${event.id}`}
          className="group relative aspect-square overflow-hidden rounded-lg"
        >
          <Image
            src={
              `${getImageUrl(event.mainImageUrl, 'public')}` ||
              '/api/placeholder/400/400'
            }
            alt={event.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
            <div className="absolute bottom-0 p-4 text-white">
              <h3 className="font-medium">{event.title}</h3>
              <p className="text-sm">{formatDate(new Date(event.createdAt))}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default EventList;
