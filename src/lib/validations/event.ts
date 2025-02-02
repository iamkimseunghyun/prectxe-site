import { z } from 'zod';

// 기본 enum 값들
const EventTypeEnum = z.enum([
  'exhibition',
  'performance',
  'workshop',
  'talk',
  'festival',
  'screening',
  'other',
]);

const EventStatusEnum = z.enum([
  'upcoming',
  'ongoing',
  'completed',
  'cancelled',
]);

// 이벤트 티켓 스키마
const eventTicketSchema = z.object({
  name: z
    .string()
    .min(1, '티켓 이름을 입력해주세요')
    .max(100, '티켓 이름이 너무 깁니다'),
  price: z.number().min(0, '가격은 0원 이상이어야 합니다'),
  quantity: z.number().min(1, '수량은 1개 이상이어야 합니다'),
});

// 이벤트 주최자 스키마
const eventOrganizerSchema = z.object({
  artistId: z.string(),
  role: z
    .string()
    .min(1, '주최자 역할을 입력해주세요')
    .max(100, '역할 설명이 너무 깁니다'),
});

// 메인 이벤트 생성/수정 스키마
export const eventFormSchema = z
  .object({
    title: z
      .string()
      .min(2, '제목은 최소 2글자 이상이어야 합니다')
      .max(100, '제목이 너무 깁니다'),
    subtitle: z.string().max(200, '부제목이 너무 깁니다').optional(),
    description: z
      .string()
      .min(10, '설명은 최소 10글자 이상이어야 합니다')
      .max(2000, '설명이 너무 깁니다'),
    type: EventTypeEnum,
    status: EventStatusEnum,
    startDate: z.string({
      message: '시작일은 현재 시간 이후여야 합니다',
    }),
    endDate: z.string({
      message: '종료일은 현재 시간 이후여야 합니다',
    }),
    price: z.number().min(0, '가격은 0원 이상이어야 합니다'),
    capacity: z.number().min(1, '수용 인원은 1명 이상이어야 합니다').optional(),
    mainImageUrl: z.string().url('올바른 이미지 URL을 입력해주세요'),
    venueId: z.string().min(1, '장소를 선택해주세요'),
    organizers: z
      .array(eventOrganizerSchema)
      .min(1, '최소 1명 이상의 주최자가 필요합니다'),
    tickets: z
      .array(eventTicketSchema)
      .min(1, '최소 1개 이상의 티켓이 필요합니다'),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: '종료일은 시작일 이후여야 합니다',
    path: ['endDate'],
  });

// 이벤트 검색/필터링을 위한 스키마
export const eventQuerySchema = z.object({
  type: EventTypeEnum.optional(),
  status: EventStatusEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(50).default(10),
  search: z.string().optional(),
});

// 타입 추출
export type EventFormType = z.infer<typeof eventFormSchema>;
export type EventQueryType = z.infer<typeof eventQuerySchema>;
