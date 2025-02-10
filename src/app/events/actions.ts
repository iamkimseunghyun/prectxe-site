'use server';

import {
  eventFormSchema,
  EventFormType,
  eventQuerySchema,
} from '@/app/events/event';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

type ActionResponse<T> = {
  data?: T;
  error?: string;
};

export async function createEvent(
  input: z.infer<typeof eventFormSchema>,
  userId: string
): Promise<ActionResponse<{ id: string }>> {
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
    });

    console.log('4. Created event:', event); // 생성된 이벤트 확인

    revalidatePath('/events', 'page');
    return { data: { id: event.id } };
  } catch (error) {
    // 에러 객체 자체를 출력
    console.error('Event creation error full object:', error);

    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: '이벤트 생성 중 오류가 발생했습니다.' };
  }
}

export async function updateEvent(
  id: string,
  input: EventFormType
): Promise<ActionResponse<{ id: string }>> {
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
    return { data: { id } };
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

export async function getEventById(id: string) {
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

    if (!event) {
      return { error: '이벤트를 찾을 수 없습니다.' };
    }

    return { data: event };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: '이벤트 조회 중 오류가 발생했습니다.' };
  }
}

export async function getRecentEvents() {
  const events = await prisma.event.findMany({
    include: {
      venue: true,
    },
  });
  return events;
}

export async function getAllEvents(query: z.infer<typeof eventQuerySchema>) {
  try {
    // 쿼리 파라미터 검증
    const validatedQuery = eventQuerySchema.parse(query);
    const { page, limit, type, status, search, startDate, endDate } =
      validatedQuery;

    // 필터 조건 구성
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { subtitle: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (startDate) where.startDate = { gte: new Date(startDate) };
    if (endDate) where.endDate = { gte: new Date(endDate) };

    // 이벤트 조회
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          venue: true,
          organizers: {
            include: {
              artist: true,
            },
          },
          tickets: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      prisma.event.count({ where }),
    ]);

    return {
      data: {
        events,
        total,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message };
    }
    return { error: '이벤트 목록 조회 중 오류가 발생했습니다.' };
  }
}

export async function handleNewEventSubmit(
  data: EventFormType,
  userId: string
) {
  if (!userId) {
    return {
      success: false,
      message: '사용자 정보가 없습니다.',
    };
  }

  return handleEventSubmit(data, 'create', undefined, userId);
}

// onSubmit을 서버 액션으로 이름 변경
export async function handleEventSubmit(
  data: EventFormType,
  mode: 'create' | 'edit',
  eventId?: string,
  userId?: string
) {
  try {
    // create 모드일 때는 createEvent만 호출
    console.log('Submit data:', data); // 입력값 확인
    if (mode === 'create') {
      // mainImageUrl과 venueId가 비어있지 않은지 확인
      if (!data.mainImageUrl) {
        return {
          success: false,
          message: '이미지 URL을 입력해주세요.',
        };
      }
      if (!data.venueId) {
        return {
          success: false,
          message: '장소를 선택해주세요.',
        };
      }
      const result = await createEvent(data, userId!);
      if ('error' in result) {
        return {
          success: false,
          message: result.error,
        };
      }
      return {
        success: true,
        message: '이벤트가 생성되었습니다.',
        id: result.data?.id,
      };
    }

    // edit 모드이고 eventId가 있을 때만 updateEvent 호출
    if (mode === 'edit' && eventId) {
      const result = await updateEvent(eventId, data);
      if ('error' in result) {
        return {
          success: false,
          message: result.error,
        };
      }
      return {
        success: true,
        message: '이벤트가 수정되었습니다.',
        id: result.data?.id,
      };
    }

    throw new Error('Invalid operation');
  } catch (error) {
    console.error('Event submission error:', error);
    return {
      success: false,
      message: '이벤트 처리 중 오류가 발생했습니다.',
    };
  }
}
