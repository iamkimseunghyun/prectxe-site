/**
 * 주문·티켓 공개 URL 빌더 + QR 페이로드 파서.
 *
 * `ticket-token.ts`(토큰 생성)와 분리한 이유: 토큰 생성은 `node:crypto`에
 * 의존하는 서버 전용 코드다. 스캐너·어드민 목록 같은 클라이언트 컴포넌트가
 * URL 빌더 하나 쓰려고 crypto를 번들에 끌고 들어오지 않게 한다.
 */

import { BUSINESS_INFO } from '@/lib/constants/business-info';

function getSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  // prod에서 env가 비었거나 localhost로 잘못 설정되면 canonical 도메인으로 강제.
  // (이메일 "입장권 보기"·QR 스캔 링크가 localhost를 가리켜 깨지던 문제 방지)
  if (
    process.env.NODE_ENV === 'production' &&
    (!env || env.includes('localhost'))
  ) {
    return BUSINESS_INFO.serviceUrl;
  }
  return env || BUSINESS_INFO.serviceUrl;
}

export function getTicketScanUrl(token: string): string {
  return `${getSiteUrl()}/scan/${token}`;
}

export function getOrderTicketsUrl(accessToken: string): string {
  return `${getSiteUrl()}/tickets/order/${accessToken}`;
}

/**
 * 스캐너에서 인식한 QR 데이터(URL 또는 raw token)에서 토큰만 추출.
 * 외부 카메라 앱 fallback 흐름과 자체 스캐너가 같은 QR 페이로드(URL)를 공유함.
 */
export function extractTicketToken(qrData: string): string | null {
  const trimmed = qrData.trim();
  // URL 형태: https://.../scan/{token}
  const urlMatch = trimmed.match(/\/scan\/([A-Za-z0-9_]+)/);
  if (urlMatch) return urlMatch[1];
  // raw token (tk_ 접두사)
  if (/^tk_[A-Za-z0-9]+$/.test(trimmed)) return trimmed;
  return null;
}
