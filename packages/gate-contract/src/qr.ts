// 의존성 없는 순수 함수만 둔다 — `@prectxe/gate-contract/qr`로 가져오면 계약의
// zod 스키마가 번들에 딸려 들어가지 않는다 (웹 스캐너 등 클라이언트 컴포넌트)

/**
 * QR 데이터(URL 또는 raw token)에서 티켓 토큰만 꺼낸다. 입장권 QR은
 * `${SITE_URL}/scan/{token}` URL이라 외부 카메라 앱으로 찍어도 안내 페이지가
 * 열리고, 웹 스캐너·게이트 앱은 여기서 토큰만 뽑는다. 아니면 null.
 */
export function extractTicketToken(qrData: string): string | null {
  const trimmed = qrData.trim();
  const urlMatch = trimmed.match(/\/scan\/([A-Za-z0-9_]+)/);
  if (urlMatch) return urlMatch[1];
  if (/^tk_[A-Za-z0-9]+$/.test(trimmed)) return trimmed;
  return null;
}
