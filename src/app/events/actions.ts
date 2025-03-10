'use server';

import {
  eventFormSchema,
  EventFormType,
  eventQuerySchema,
} from '@/app/events/event';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function createEvent(
  input: z.infer<typeof eventFormSchema>,
  userId: string
) {
  try {
    console.log('1. Raw input:', input); // 입력 데이터 확인
    const validatedData = eventFormSchema.parse(input);
    console.log('2. Validated data:', validatedData); // 검증된 데이터 확인

    // 데이터 구조 explicitly 정의
    const eventData = {
      title: validatedData.title,
      subtitle: validatedData.subtitle,
      description: validatedData.description,
      type: validatedData.type,
      status: validatedData.status,
      startDate: new Date(validatedData.startDate),
      endDate: new Date(validatedData.endDate),
      mainImageUrl: validatedData.mainImageUrl,
      venueId: validatedData.venueId,
      userId,
      organizers: {
        createMany: {
          data: validatedData.organizers.map((org) => ({
            artistId: org.artistId,
            role: org.role,
          })),
        },
      },
      tickets: {
        createMany: {
          data: validatedData.tickets.map((ticket) => ({
            name: ticket.name,
            price: ticket.price,
            quantity: ticket.quantity,
          })),
        },
      },
    };

    console.log('3. Prisma input:', eventData); // Prisma에 전달되는 데이터 확인

    const event = await prisma.event.create({
      data: eventData,
      select: {
        id: true,
      },
    });

    console.log('4. Created event:', event); // 생성된 이벤트 확인

    revalidatePath('/events', 'page');
    return { ok: true, data: event };
  } catch (error) {
    // 에러 객체 자체를 출력
    console.error('Event creation error full object:', error);

    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: '이벤트 생성 중 오류가 발생했습니다.' };
  }
}

export async function updateEvent(id: string, input: EventFormType) {
  try {
    // 입력 값 검증
    const validatedData = eventFormSchema.parse(input);

    // 이벤트 존재 여부 확인
    const existingEvent = await prisma.event.findUnique({
      where: { id },
    });

    if (!existingEvent) {
      return { error: '이벤트를 찾을 수 없습니다.' };
    }

    // 이벤트 업데이트
    await prisma.$transaction(async (tx) => {
      // 기존 주최자, 티켓 정보 삭제
      await tx.eventOrganizer.deleteMany({
        where: {
          eventId: id,
        },
      });
      await tx.eventTicket.deleteMany({
        where: {
          eventId: id,
        },
      });

      // 이벤트 정보 업데이트
      await tx.event.update({
        where: {
          id,
        },
        data: {
          title: validatedData.title,
          subtitle: validatedData.subtitle,
          description: validatedData.description,
          type: validatedData.type,
          status: validatedData.status,
          startDate: new Date(validatedData.startDate),
          endDate: new Date(validatedData.endDate),
          mainImageUrl: validatedData.mainImageUrl,
          venueId: validatedData.venueId,
          // 새로운 주최자 정보 생성
          organizers: {
            createMany: {
              data: validatedData.organizers,
            },
          },
          // 새로운 티켓 정보 생성
          tickets: {
            createMany: {
              data: validatedData.tickets,
            },
          },
        },
      });
    });
    revalidatePath('/events');
    revalidatePath(`/events/${id}`);
    return { ok: true, data: { id } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: '이벤트 수정 중 오류가 발생했습니다.' };
  }
}

export async function deleteEvent(id: string) {
  try {
    await prisma.event.delete({
      where: {
        id: id,
      },
    });
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export const getEventsByArtistIdWithCache = async (artistId: string) => {
  const artworks = await prisma.event.findMany({
    where: {
      organizers: {
        some: {
          artistId: artistId,
        },
      },
    },
    include: {
      images: {
        orderBy: {
          order: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  console.log(`Found ${artworks.length} artworks for artist ${artistId}`);
  return artworks;
};

export async function getEventsByArtistId(artistId: string) {
  return getEventsByArtistIdWithCache(artistId);
}

export const getEventByIdWithCache = async (id: string) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        venue: true,
        organizers: {
          include: {
            artist: true,
          },
        },
        tickets: true,
      },
    });

    // 이벤트가 존재하지 않는 경우
    if (!event) {
      return { error: '이벤트를 찾을 수 없습니다.' };
    }

    // date 타입 안전하게 변환 및 널 체크
    const formattedData = {
      ...event,
      startDate: event.startDate ? event.startDate.toISOString() : undefined,
      endDate: event.endDate ? event.endDate.toISOString() : undefined,
      // venue 널 체크
      venue: event.venue || undefined,
      // organizers 널 체크 및 안전한 변환
      organizers: (event.organizers || []).map((org) => ({
        ...org,
        artist: org.artist || undefined,
      })),
      // tickets 널 체크
      tickets: event.tickets || [],
    };

    return { data: formattedData };
  } catch (error) {
    console.error('이벤트 조회 에러:', error);
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: '이벤트 조회 중 오류가 발생했습니다.' };
  }
};

export async function getEventById(id: string) {
  return getEventByIdWithCache(id);
}
