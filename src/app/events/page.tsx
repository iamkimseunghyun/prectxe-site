import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { prisma } from '@/lib/db/prisma';
import { formatEventDate, getImageUrl } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';

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
  startDate: string;
  endDate: string;
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
    <div className="relative w-full">
      <Image
        src={getImageUrl(`${event.mainImageUrl}`, 'smaller')}
        alt={event.title}
        width={200}
        height={200}
        className="h-full w-full rounded-t-lg object-cover"
      />
      <div className="absolute right-4 top-4">
        <EventStatusBadge status={event.status} />
      </div>
    </div>
    <CardHeader>
      <CardTitle className="text-xl font-bold">{event.title}</CardTitle>
      <CardDescription>{event.subtitle}</CardDescription>
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

const Page = async () => {
  const events = await prisma.event.findMany({
    include: {
      venue: true,
    },
    orderBy: {
      startDate: 'desc',
    },
  });

  // null 값을 undefined로 변환
  const formattedEvents = events.map((event) => ({
    ...event,
    subtitle: event.subtitle ?? null,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
  }));

  if (formattedEvents.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-4xl font-bold">이벤트</h1>
        <p className="mb-4 max-w-2xl text-gray-600">
          PRECTXE의 이벤트를 즐겨보세요. 다양한 장소에서 흥미로운 일들이
          펼쳐집니다.
        </p>
        <div className="mb-6 flex gap-4">
          <Badge variant="secondary">전체</Badge>
          <Badge variant="outline">전시</Badge>
          <Badge variant="outline">퍼포먼스</Badge>
          <Badge variant="outline">워크샵</Badge>
          <Badge variant="outline">토크</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* 이벤트 카드들이 여기에 매핑됩니다 */}
        {formattedEvents.map((event) => (
          <Link href={`/events/${event.id}`} key={event.id}>
            <EventCard event={event} />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Page;
