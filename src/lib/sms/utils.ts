/**
 * 전화번호 유틸 함수 (클라이언트 안전)
 */

/**
 * 전화번호 형식 검증 (한국 휴대폰)
 */
export function validatePhoneNumber(phone: string): boolean {
  return /^01[0-9]{8,9}$/.test(phone);
}

/**
 * 전화번호 포맷팅 (010-1234-5678 → 01012345678)
 * 자동 보정: 1로 시작하는 10자리 번호는 앞에 0 추가
 */
export function normalizePhoneNumber(phone: string): string {
  // 숫자만 추출
  let normalized = phone.replace(/[^0-9]/g, '');

  // 1로 시작하고 10자리면 앞에 0 추가 (자동 보정)
  if (normalized.startsWith('1') && normalized.length === 10) {
    normalized = '0' + normalized;
  }

  return normalized;
}

/**
 * 배열에서 유효한 전화번호만 필터링
 */
export function filterValidPhoneNumbers(phones: string[]): string[] {
  return phones
    .map(normalizePhoneNumber)
    .filter(validatePhoneNumber)
    .filter((phone, index, self) => self.indexOf(phone) === index); // 중복 제거
}
