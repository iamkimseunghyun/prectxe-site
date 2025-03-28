import { EventStatus, EventType } from '@prisma/client';

// 공통 타입 정의
export type ImageData = {
  id?: string;
  imageUrl?: string;
  alt?: string;
  order?: number;
};

// Enum 타입 정의
export enum ProjectCategory {
  EXHIBITION = 'exhibition',
  PERFORMANCE = 'performance',
  FESTIVAL = 'festival',
  WORKSHOP = 'workshop',
}

export { EventStatus, EventType }; // Prisma enum을 그대로 재내보내기

// API 응답 타입
export type ApiResponse<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };
