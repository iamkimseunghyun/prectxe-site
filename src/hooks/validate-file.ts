import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/constants/constants';

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
}
