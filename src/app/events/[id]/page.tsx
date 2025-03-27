import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Info, MapPin } from 'lucide-react';
import { getEventById } from '@/app/events/actions';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import {
  formatEventDate,
  getImageUrl,
  isEventBookingClosed,
} from '@/lib/utils';
import AdminButton from '@/components/admin-button';
import getSession from '@/lib/session';
import BreadcrumbNav from '@/components/breadcrum-nav';
import canManage from '@/lib/can-manage';
import { Metadata } from 'next';
import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = (await params).id;
  const event = await prisma.event.findUnique({
    where: { id: id },
    select: {
      title: true,
      subtitle: true,
      description: true,
      mainImageUrl: true,
      startDate: true,
      endDate: true,
      type: true,
      status: true,
      venue: {
        select: {
          name: true,
          address: true,
        },
      },
      organizers: {
        select: {
          artist: {
            select: {
              name: true,
              nameKr: true,
            },
          },
          role: true,
        },
      },
    },
  });

  if (!event) {
    return {
      title: 'Event Not Found',
    };
  }

  const organizers = event.organizers
    .map((org) => `${org.artist.nameKr} (${org.artist.name}) - ${org.role}`)
    .join(', ');

  return {
    title: event.title,
    description: `${event.subtitle ? event.subtitle + ' - ' : ''}${event.description.slice(0, 120)}`,
    openGraph: {
      title: event.title,
      description: event.description.slice(0, 160),
      images: event.mainImageUrl ? [{ url: event.mainImageUrl }] : undefined,
      type: 'article',
      publishedTime: event.startDate.toISOString(),
      modifiedTime: event.endDate.toISOString(),
      authors: event.organizers.map((org) => org.artist.nameKr),
      siteName: 'PRECTXE',
    },
    other: {
      'event:status': event.status,
      'event:type': event.type,
      'event:organizers': organizers,
      'event-location': event.venue
        ? `${event.venue.name} - ${event.venue.address}`
        : '',
    },
  };
}

export async function generateStaticParams() {
  const events = await prisma.event.findMany({
    select: { id: true },
  });

  return events.map((event) => ({
    id: event.id,
  }));
}

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const result = await getEventById(id);

  if (!result.data) {
    notFound();
  }

  const session = await getSession();

  const canEdit = await canManage(session.id!, result.data.id);

  return (
    <div className="mx-auto px-4 py-6 sm:max-w-5xl sm:px-12">
      <BreadcrumbNav entityType={'event'} title={result.data.title!} />
      {/* 이벤트 헤더 섹션 */}
      <div className="mb-2 sm:mb-8">
        <div className="mb-4 flex items-center gap-2">
          <Badge>{result.data.type}</Badge>
          <Badge variant="outline">{result.data.status}</Badge>
        </div>
        <h1 className="mb-2 text-xl font-bold sm:text-4xl">
          {result.data.title}
        </h1>
        <p className="text-md mb-4 text-gray-600 sm:text-xl">
          {result.data.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* 메인 컨텐츠 영역 */}
        <div className="lg:col-span-2">
          {/* 메인 이미지 */}
          <div className="justify-left relative mb-8 flex aspect-square w-full items-center overflow-hidden rounded-lg">
            <Image
              src={getImageUrl(`${result.data.mainImageUrl}`, 'smaller')}
              alt={result.data.title!}
              fill
              priority
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              placeholder="blur"
              blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
              className="object-cover"
            />
          </div>

          {/* 탭 컨텐츠 */}
          <Tabs defaultValue="info" className="mb-8">
            <TabsList>
              <TabsTrigger value="info">상세 정보</TabsTrigger>
              <TabsTrigger value="organizer">출연진</TabsTrigger>
              <TabsTrigger value="venue">장소</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4">
              <Card>
                <CardContent className="prose max-w-none pt-6">
                  <div className="whitespace-pre-wrap">
                    {result.data.description}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="organizer" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {result.data.organizers?.map((organizer) => (
                      <div
                        key={organizer.artistId}
                        className="flex items-center gap-4"
                      >
                        {organizer.artist.mainImageUrl ? (
                          <div className="relative aspect-square h-16 w-16 overflow-hidden rounded-full">
                            <Image
                              unoptimized
                              src={getImageUrl(
                                organizer.artist.mainImageUrl,
                                'thumbnail'
                              )}
                              alt={organizer.artist.name}
                              fill
                              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                              placeholder="blur"
                              blurDataURL="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3C/svg%3E"
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200">
                            <span className="text-xl font-semibold text-gray-600">
                              {organizer.artist.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <Link href={`/artists/${organizer.artistId}`}>
                          <div>
                            <div className="font-semibold">
                              {organizer.artist.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {organizer.role}
                            </div>
                          </div>
                        </Link>
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
                      {result.data.venue?.name}
                    </h3>
                    <p className="whitespace-pre-line">
                      {result.data.venue?.description}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {result.data.venue?.address}
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
              <div className="space-y-4">
                {/* 일시 정보 */}
                <div className="w-full">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="font-semibold">일시</span>
                  </div>
                  <div className="ml-6">
                    {formatEventDate(
                      new Date(result.data.startDate || new Date()),
                      new Date(result.data.endDate || new Date())
                    )}
                  </div>
                </div>

                {/* 장소 정보 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span className="font-semibold">장소</span>
                  </div>
                  <div className="ml-6">{result.data.venue?.name}</div>
                </div>

                {/* 운영 시간 */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="font-semibold">운영 시간</span>
                  </div>
                  <div className="ml-6">
                    {/*{new Date(result.data.startDate).toLocaleTimeString()} -*/}
                    {/*{new Date(result.data.endDate).toLocaleTimeString()}*/}
                    18:00 - 20:30
                  </div>
                </div>

                {/* 티켓 정보 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    <span className="font-semibold">티켓 정보</span>
                  </div>
                  {result.data.tickets?.map((ticket) => (
                    <div key={ticket.id} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold">{ticket.name}</span>
                        {(() => {
                          const bookingClosed = isEventBookingClosed(
                            result.data.startDate || new Date()
                          );

                          return bookingClosed ? (
                            <Badge variant="default">CLOSED</Badge>
                          ) : (
                            <span className="font-semibold">
                              {ticket.price === 0
                                ? '무료'
                                : `₩${ticket.price.toLocaleString()}`}
                            </span>
                          );
                        })()}
                      </div>
                      {/*</div>*/}
                      <Button
                        className="w-full border border-gray-400"
                        disabled={isEventBookingClosed(
                          result.data.startDate || new Date()
                        )}
                        variant={
                          isEventBookingClosed(
                            result.data.startDate || new Date()
                          )
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {isEventBookingClosed(
                          result.data.startDate || new Date()
                        )
                          ? '예매 마감'
                          : '예매하기'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* 어드민 버튼 */}
      {canEdit && (
        <div className="mt-6 flex justify-end gap-x-2">
          <AdminButton id={id} entityType="event" />
        </div>
      )}
    </div>
  );
};

export default Page;
