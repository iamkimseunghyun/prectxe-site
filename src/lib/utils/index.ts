/**
 * @/lib/utils — 공용 유틸 re-export.
 *
 * 토픽별 파일 위치:
 * - cn.ts: Tailwind className 머지
 * - date.ts: 날짜 포맷
 * - image-url.ts: Cloudflare 이미지/영상 URL 처리
 * - upload.ts: 이미지 업로드 + 검증
 * - text.ts: 한글/슬러그/아티스트 이름
 * - 도메인 전용 유틸은 별도 파일 (ticket-status, ticket-token, bank-transfer 등)
 */
export { cn } from './cn';
export {
  formatDate,
  formatDateForForm,
  formatDateForInput,
  formatEventDate,
  isSameDay,
} from './date';
export { extractImageId, extractVideoId, getImageUrl } from './image-url';
export {
  artistInitials,
  containsKorean,
  formatArtistName,
  slugify,
} from './text';
export {
  uploadGalleryImages,
  uploadImage,
  uploadSingleImage,
  validateImageFile,
} from './upload';
