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
import { Calendar, MapPin, Clock } from 'lucide-react';

type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
type EventType =
  | 'exhibition'
  | 'performance'
  | 'workshop'
  | 'talk'
  | 'screening'
  | 'other';

interface Venue {
  id: string;
  name: string;
}

interface Event {
  title: string;
  subtitle?: string;
  mainImageUrl: string;
  status: EventStatus;
  type: EventType;
  startDate: string;
  endDate: string;
  price: number;
  venueId: string;
  venue: Venue;
}

interface EventStatusBadgeProps {
  status: EventStatus;
}

const EventStatusBadge = ({ status }: EventStatusBadgeProps) => {
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
    <div className="relative h-48 w-full">
      <img
        src={event.mainImageUrl}
        alt={event.title}
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
            {new Date(event.startDate).toLocaleDateString()} -
            {new Date(event.endDate).toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{event.venue.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{event.type}</span>
        </div>
      </div>
    </CardContent>
    <CardFooter className="justify-between">
      <div className="text-lg font-semibold">
        {event.price === 0 ? '무료' : `₩${event.price.toLocaleString()}`}
      </div>
      <Badge variant="outline">자세히 보기</Badge>
    </CardFooter>
  </Card>
);

const Page = () => {
  const sampleEvents: Event[] = [
    {
      title: '디지털 아트 페스티벌 2025',
      subtitle: '기술과 예술의 만남',
      mainImageUrl: '/api/placeholder/800/600',
      status: 'upcoming',
      type: 'exhibition',
      startDate: '2025-03-01',
      endDate: '2025-03-15',
      price: 15000,
      venueId: '1',
      venue: {
        id: '1',
        name: 'PRECTXE 갤러리',
      },
    },
    {
      title: '인터랙티브 미디어 퍼포먼스',
      subtitle: '관객과 함께하는 새로운 경험',
      mainImageUrl: '/api/placeholder/800/600',
      status: 'upcoming',
      type: 'performance',
      startDate: '2025-04-01',
      endDate: '2025-04-01',
      price: 30000,
      venueId: '2',
      venue: {
        id: '2',
        name: 'PRECTXE 공연장',
      },
    },
    {
      title: 'NFT 아트 워크샵',
      subtitle: '블록체인과 예술의 융합',
      mainImageUrl: '/api/placeholder/800/600',
      status: 'ongoing',
      type: 'workshop',
      startDate: '2025-02-01',
      endDate: '2025-02-28',
      price: 50000,
      venueId: '3',
      venue: {
        id: '3',
        name: 'PRECTXE 스튜디오',
      },
    },
  ];
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="mb-4 text-3xl font-bold">PRECTXE 이벤트</h1>
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
        {sampleEvents.map((event) => (
          <EventCard key={event.venueId} event={event} />
        ))}
      </div>
    </div>
  );
};

export default Page;
