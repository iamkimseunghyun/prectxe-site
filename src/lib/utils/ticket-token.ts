/**
 * 티켓 / 마이페이지 접근 토큰 유틸
 * - Ticket.token: QR 페이로드 (스캔 시 입장 검증용)
 * - Order.accessToken: /tickets/order/[accessToken] 마이페이지 접근용
 *
 * 둘 다 unguessable. 24자 base36 (≈ 124 bits).
 */

import { randomBytes } from 'node:crypto';

function generateRandomToken(byteLength = 16): string {
  // base36으로 인코딩 → 짧고 URL-safe
  return randomBytes(byteLength).toString('hex');
}

export function generateTicketToken(): string {
  return `tk_${generateRandomToken(16)}`;
}

export function generateAccessToken(): string {
  return `at_${generateRandomToken(16)}`;
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://prectxe.com';
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
