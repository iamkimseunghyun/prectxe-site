import React from 'react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

import { getAllEvents } from '@/modules/events/server/actions';
import EventCard from '@/modules/events/ui/section/event-card';

export const dynamic = 'force-dynamic';
export const revalidate = 86400;

const Page = async () => {
  const events = await getAllEvents();

  if (events.data?.length === 0) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-gray-50 text-gray-500">
        <p>프로젝트가 없습니다.</p>
      </div>
    );
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
        {events.data?.map((event) => (
          <Link href={`/events/${event.id}`} key={event.id}>
            <EventCard event={event} />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default Page;
