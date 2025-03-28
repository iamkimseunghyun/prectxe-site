// 이벤트 티켓 스키마
import { z } from 'zod';
import {
  isoDateStringSchema,
  nonEmptyStringSchema,
  sanitizedTextTransformer,
} from '@/lib/schemas/base';
import { EventStatus, EventType } from '@/lib/schemas/types';

export const eventTicketSchema = z.object({
  name: z
    .string()
    .min(1, '티켓 이름을 입력해주세요.')
    .max(100, '티켓 이름이 너무 깁니다.'),
  price: z.number().min(0, '가격은 0원 이상이어야 합니다.'),
  quantity: z.number().min(1, '수량은 1개 이상이어야 합니다.'),
});

// 이벤트 주최자 스키마
export const eventOrganizerSchema = z.object({
  artistId: z.string(),
  role: z
    .string()
    .min(1, '주최자 역할을 입력해주세요.')
    .max(100, '역할 설명이 너무 깁니다.'),
});

// 이벤트 스키마
export const eventSchema = z
  .object({
    title: z
      .string()
      .min(2, '제목은 최소 2글자 이상이어야 합니다.')
      .max(100, '제목이 너무 깁니다.'),
    subtitle: z.string().max(200, '부제목이 너무 깁니다.').optional(),
    description: z
      .string()
      .max(2000, '설명이 너무 깁니다.')
      .transform(sanitizedTextTransformer),
    type: z.nativeEnum(EventType),
    status: z.nativeEnum(EventStatus),
    startDate: isoDateStringSchema,
    endDate: isoDateStringSchema,
    mainImageUrl: nonEmptyStringSchema,
    venueId: z.string().optional(),
    organizers: z
      .array(eventOrganizerSchema)
      .min(1, '최소 1명 이상의 주최자가 필요합니다'),
    tickets: z
      .array(eventTicketSchema)
      .min(1, '최소 1개 이상의 티켓이 필요합니다.'),
  })
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: '종료일은 시작일과 같거나 이후여야 합니다.',
    path: ['endDate'],
  });

// 이벤트 쿼리 스키마
export const eventQuerySchema = z.object({
  type: z.nativeEnum(EventType).optional(),
  status: z.nativeEnum(EventStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
  search: z.string().optional(),
});

// 타입 내보내기
export type Event = z.infer<typeof eventSchema>;
export type EventTicket = z.infer<typeof eventTicketSchema>;
export type EventOrganizer = z.infer<typeof eventOrganizerSchema>;
export type EventQuery = z.infer<typeof eventQuerySchema>;
