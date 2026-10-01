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

/**
 * 로그용 이메일 마스킹 — `kaka@laaf.kr` → `ka**@laaf.kr`.
 *
 * 도메인은 남겨 장애 분석(특정 메일 서버 거부 등)이 가능하게 하되,
 * 로컬 파트를 가려 로그만으로 개인을 식별하지 못하게 한다.
 * DB에 남기는 발송 기록에는 쓰지 않는다 — 어드민이 봐야 하는 정보다.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '***';

  const local = email.slice(0, at);
  const domain = email.slice(at);

  // 로컬 파트가 2자 이하면 앞 2자를 남겨도 사실상 전부 노출된다.
  if (local.length <= 2) return `${'*'.repeat(local.length)}${domain}`;

  return `${local.slice(0, 2)}${'*'.repeat(local.length - 2)}${domain}`;
}

/**
 * HTML 태그를 걷어낸 순수 텍스트.
 *
 * 리치 에디터가 비어 있어도 `<p></p>` 같은 마크업을 남기므로,
 * "내용이 있는가"를 판단하려면 태그를 제거하고 봐야 한다.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}
