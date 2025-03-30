import { EventStatus, EventType, ProjectCategory } from '@prisma/client';

// Prisma enum을 그대로 재내보내기
export { EventStatus, EventType, ProjectCategory };

// API 응답 타입
export type ApiResponse<T = undefined> =
  | { success: true; data: T; message?: string }
  | { success: false; error: string; details?: any };

export type ImagePreview = {
  preview: string;
  file: File | null;
  uploadURL: string;
  imageUrl: string;
  alt: string;
  order: number;
};
