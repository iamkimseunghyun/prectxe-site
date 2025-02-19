import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GalleryPreview } from '@/lib/validations/gallery-image';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일`;
};

export const formatDateForInput = (
  isoString: string | null | undefined
): string => {
  if (!isoString) return formatDate(new Date());
  return isoString.split('T')[0]; // "2024-02-01T00:00:00.000Z" -> "2024-02-01"
};

// 1. utils.ts에 안전한 날짜 변환 함수 추가
export function formatDateForForm(
  dateString: string | Date | undefined
): string {
  try {
    if (!dateString) {
      return new Date().toISOString().split('T')[0];
    }

    const date =
      typeof dateString === 'string' ? new Date(dateString) : dateString;

    // UTC 날짜를 YYYY-MM-DD 형식으로 변환 (시간대 조정 없이)
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.error('날짜 변환 오류:', e);
    return new Date().toISOString().split('T')[0];
  }
}

export const getImageUrl = (
  url: string | null | undefined,
  variant: 'thumbnail' | 'public' | 'smaller' | 'hires'
) => {
  if (!url) return '/images/placeholder.png'; // 빈 문자열 대신 기본 이미지 경로 반환
  return `${url}/${variant}`;
};

export const uploadSingleImage = async (imageFile: File, uploadURL: string) => {
  if (imageFile) {
    const cloudFlareForm = new FormData();
    cloudFlareForm.append('file', imageFile);
    const response = await fetch(uploadURL, {
      method: 'POST',
      body: cloudFlareForm,
    });
    if (response.status !== 200) {
      throw new Error('Failed to upload main image');
    }
  }
};

// 이미지 업로드 함수 (클라이언트)
export const uploadImage = async (
  file: File,
  uploadURL: string
): Promise<boolean> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(uploadURL, {
      method: 'POST',
      body: formData,
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to upload image:', error);
    return false;
  }
};

export const uploadGalleryImages = async (previews: GalleryPreview[]) => {
  return Promise.all(
    previews.map(async (preview) => {
      const formData = new FormData();
      formData.append('file', preview.file!);
      const response = await fetch(preview.uploadURL, {
        method: 'POST',
        body: formData,
      });
      if (response.status !== 200) {
        throw new Error(`Failed to upload: ${preview.alt}`);
      }
    })
  );
};

/**
 * 이벤트 예매 가능 여부를 확인하는 함수
 * @param startDate 이벤트 시작 날짜
 * @returns boolean
 */
export const isEventBookingClosed = (startDate: Date | string): boolean => {
  const now = new Date();
  const eventStart = new Date(startDate);
  const oneDayBefore = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);

  return now >= oneDayBefore;
};

/**
 * 이벤트 예매 마감까지 남은 시간을 반환하는 함수 (필요시 사용)
 * @param startDate 이벤트 시작 날짜
 * @returns string
 */
export const getTimeUntilBookingClose = (startDate: Date | string): string => {
  const now = new Date();
  const eventStart = new Date(startDate);
  const oneDayBefore = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000);

  if (now >= oneDayBefore) {
    return '예매 마감';
  }

  const diffTime = oneDayBefore.getTime() - now.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(
    (diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (diffDays > 0) {
    return `예매 마감까지 ${diffDays}일 ${diffHours}시간`;
  }
  return `예매 마감까지 ${diffHours}시간`;
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const formatEventDate = (startDate: Date, endDate: Date): string => {
  const formattedStart = formatDate(startDate);

  if (isSameDay(startDate, endDate)) {
    return formattedStart;
  }

  return `${formattedStart} - ${formatDate(endDate)}`;
};
