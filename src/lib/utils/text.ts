/**
 * 텍스트에 한글이 포함되어 있는지 확인
 */
export function containsKorean(text: string): boolean {
  return /[가-힯ᄀ-ᇿ㄰-㆏]/.test(text);
}

/**
 * 텍스트를 URL 슬러그로 변환
 * - 영문/숫자만 포함된 경우: 자동 생성
 * - 한글 포함된 경우: null 반환 (수동 입력 필요)
 */
export function slugify(text: string): string | null {
  if (!text.trim()) return null;
  if (containsKorean(text)) return null;
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 아티스트 이름을 "KR (EN)" 형태로 표시. 한쪽만 있으면 그것만.
 */
export function formatArtistName(
  kr?: string | null,
  en?: string | null
): string {
  const krSafe = (kr || '').trim();
  const enSafe = (en || '').trim();
  if (krSafe && enSafe) return `${krSafe} (${enSafe})`;
  return krSafe || enSafe || 'Unknown';
}

/**
 * 영문 이름의 앞 2글자 이니셜. 영문 없으면 한글 앞 2글자.
 */
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
