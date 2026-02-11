import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants/constants';
import type { ImagePreview } from '@/lib/schemas';

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
  // Remove any trailing size indicators
  const baseUrl = url.replace(/\/(thumbnail|smaller|public)$/, '');

  // Return with proper size parameter
  return `${baseUrl}/${variant}`;
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

export const uploadGalleryImages = async (previews: ImagePreview[]) => {
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

export const extractCloudflareImageId = (url: string) => {
  const regex = /imagedelivery\.net\/[^/]+\/([^/]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
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

/**
 * 텍스트에 한글이 포함되어 있는지 확인
 */
export function containsKorean(text: string): boolean {
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
}

/**
 * 텍스트를 URL 슬러그로 변환
 * - 영문/숫자만 포함된 경우: 자동 생성
 * - 한글 포함된 경우: null 반환 (수동 입력 필요)
 */
export function slugify(text: string): string | null {
  if (!text.trim()) return null;

  // 한글이 포함되면 자동 생성 불가
  if (containsKorean(text)) return null;

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // 특수문자 제거
    .replace(/\s+/g, '-') // 공백을 하이픈으로
    .replace(/-+/g, '-') // 연속 하이픈 정리
    .replace(/^-|-$/g, ''); // 앞뒤 하이픈 제거
}

// Format artist name as "KR (EN)" with graceful fallback
export function formatArtistName(
  kr?: string | null,
  en?: string | null
): string {
  const krSafe = (kr || '').trim();
  const enSafe = (en || '').trim();
  if (krSafe && enSafe) return `${krSafe} (${enSafe})`;
  return krSafe || enSafe || 'Unknown';
}

// Build initials from English name, fallback to first 2 chars of KR
export function artistInitials(en?: string | null, kr?: string | null): string {
  const enSafe = (en || '').trim();
  if (enSafe) {
    return enSafe
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0]!)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  const krSafe = (kr || '').trim();
  return krSafe.substring(0, 2) || 'A';
}

export default function validateImageFile(file: File) {
  // 파일 접근 가능 여부 확인
  try {
    file.slice(0, 1).arrayBuffer();
  } catch (e) {
    console.error(e);
    throw new Error(
      '파일에 접근할 수 없습니다. 파일이 사용 가능한 상태인지 확인해주세요.'
    );
  }
  // 파일 타입 검증
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new Error(
      '지원되지 않는 이미지 형식입니다. JPG, PNG, GIF, WEBP, HEIC만 가능합니다.'
    );
  }

  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 5MB를 초과할 수 없습니다.');
  }

  return null;
}
