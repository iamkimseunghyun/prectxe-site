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
