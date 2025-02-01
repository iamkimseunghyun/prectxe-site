import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, MapPin, Clock, Users, Info } from 'lucide-react';

type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
type EventType =
  | 'exhibition'
  | 'performance'
  | 'workshop'
  | 'talk'
  | 'screening'
  | 'other';

interface Artist {
  id: string;
  name: string;
  mainImageUrl: string;
}

interface Venue {
  id: string;
  name: string;
  description: string;
  address: string;
}

interface EventOrganizer {
  artistId: string;
  artist: Artist;
  role: string;
}

interface EventTicket {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Event {
  title: string;
  subtitle?: string;
  description: string;
  mainImageUrl: string;
  status: EventStatus;
  type: EventType;
  startDate: string;
  endDate: string;
  price: number;
  capacity?: number;
  venueId: string;
  venue: Venue;
  organizers: EventOrganizer[];
  tickets: EventTicket[];
}

const Page = ({ event }: { event: Event | undefined }) => {
  if (!event) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-semibold">이벤트 로딩 중...</h2>
            <p className="text-gray-500">잠시만 기다려주세요.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="container mx-auto py-8">
      {/* 이벤트 헤더 섹션 */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Badge>{event.type}</Badge>
          <Badge variant="outline">{event.status}</Badge>
        </div>
        <h1 className="mb-2 text-4xl font-bold">{event.title}</h1>
        <p className="mb-4 text-xl text-gray-600">{event.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* 메인 컨텐츠 영역 */}
        <div className="lg:col-span-2">
          {/* 메인 이미지 */}
          <div className="mb-8">
            <img
              src={event.mainImageUrl}
              alt={event.title}
              className="h-96 w-full rounded-lg object-cover"
            />
          </div>

          {/* 탭 컨텐츠 */}
          <Tabs defaultValue="info" className="mb-8">
            <TabsList>
              <TabsTrigger value="info">상세 정보</TabsTrigger>
              <TabsTrigger value="organizer">주최자</TabsTrigger>
              <TabsTrigger value="venue">장소</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <Card>
                <CardContent className="prose max-w-none pt-6">
                  <div className="whitespace-pre-wrap">{event.description}</div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="organizer" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {event.organizers.map((organizer) => (
                      <div
                        key={organizer.artistId}
                        className="flex items-center gap-4"
                      >
                        <img
                          src={organizer.artist.mainImageUrl}
                          alt={organizer.artist.name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                        <div>
                          <div className="font-semibold">
                            {organizer.artist.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {organizer.role}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="venue" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">
                      {event.venue.name}
                    </h3>
                    <p>{event.venue.description}</p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {event.venue.address}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 사이드바 - 티켓 정보 */}
        <div className="lg:col-span-1">
          <Card className="sticky top-8">
            <CardContent className="pt-6">
              <div className="space-y-6">
                {/* 일시 정보 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold">일시</span>
                  </div>
                  <div className="ml-6">
                    {new Date(event.startDate).toLocaleDateString()} -
                    {new Date(event.endDate).toLocaleDateString()}
                  </div>
                </div>

                {/* 장소 정보 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-semibold">장소</span>
                  </div>
                  <div className="ml-6">{event.venue.name}</div>
                </div>

                {/* 운영 시간 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-semibold">운영 시간</span>
                  </div>
                  <div className="ml-6">
                    {new Date(event.startDate).toLocaleTimeString()} -
                    {new Date(event.endDate).toLocaleTimeString()}
                  </div>
                </div>

                {/* 수용 인원 */}
                {event.capacity && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="font-semibold">수용 인원</span>
                    </div>
                    <div className="ml-6">{event.capacity}명</div>
                  </div>
                )}

                {/* 티켓 정보 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span className="font-semibold">티켓 정보</span>
                  </div>
                  {event.tickets.map((ticket) => (
                    <div key={ticket.id} className="ml-6 rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">{ticket.name}</span>
                        <span className="font-semibold">
                          {ticket.price === 0
                            ? '무료'
                            : `₩${ticket.price.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="mb-4 text-sm text-gray-600">
                        남은 수량: {ticket.quantity}매
                      </div>
                      <Button className="w-full">예매하기</Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Page;
