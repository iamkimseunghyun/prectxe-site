import { Calendar, Clock, MapPin } from 'lucide-react';
import Image from 'next/image';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatEventDate, getImageUrl } from '@/lib/utils';

type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
type EventType =
  | 'exhibition'
  | 'performance'
  | 'workshop'
  | 'talk'
  | 'festival'
  | 'screening'
  | 'other';

interface Venue {
  id: string;
  name: string;
}

interface Event {
  title: string;
  subtitle?: string | null;
  mainImageUrl: string;
  status: EventStatus;
  type: EventType;
  startDate: Date;
  endDate: Date;
  venueId: string | null;
  venue: Venue | null;
}

interface EventStatusBadgeProps {
  status: EventStatus;
}

const EventStatusBadge = async ({ status }: EventStatusBadgeProps) => {
  const statusColors: Record<EventStatus, string> = {
    upcoming: 'bg-blue-500',
    ongoing: 'bg-green-500',
    completed: 'bg-gray-500',
    cancelled: 'bg-red-500',
  };

  return (
    <Badge className={`${statusColors[status]} text-white`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
};

const EventCard = ({ event }: { event: Event }) => (
  <Card className="w-full transition-shadow hover:shadow-lg">
    <div className="relative aspect-square w-full overflow-hidden rounded-t-lg">
      <Image
        src={getImageUrl(`${event.mainImageUrl}`, 'smaller')}
        alt={event.title}
        fill
        priority
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        placeholder="blur"
        blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
        className="object-cover"
      />
      <div className="absolute right-4 top-4">
        <EventStatusBadge status={event.status} />
      </div>
    </div>
    <CardHeader>
      <CardTitle className="text-xl font-bold">{event.title}</CardTitle>
      <CardDescription className="line-clamp-1">
        {event.subtitle}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>
            {formatEventDate(
              new Date(event.startDate),
              new Date(event.endDate)
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{event.venue?.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{event.type}</span>
        </div>
      </div>
    </CardContent>
    <CardFooter className="justify-between">
      <div className="text-lg font-semibold">
        {/*{event.price === 0 ? '무료' : `₩${event.price.toLocaleString()}`}*/}
      </div>
      <Badge variant="outline">자세히 보기</Badge>
    </CardFooter>
  </Card>
);

export default EventCard;
