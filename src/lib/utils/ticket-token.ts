/**
 * 주문·티켓 관련 식별자 / 토큰 / URL 유틸
 *
 * - Order.orderNo: 사람이 읽는 주문번호 (PRXE-YYYYMMDD-XXXXXX, 비유추적이지 않음)
 * - Order.accessToken: /tickets/order/[accessToken] 마이페이지 접근용 (unguessable)
 * - Ticket.token: QR 페이로드 (스캔 시 입장 검증용, unguessable)
 *
 * accessToken / ticketToken은 randomBytes(16) → hex 32자 (≈128 bits).
 */

import { randomBytes } from 'node:crypto';

function generateRandomToken(byteLength = 16): string {
  return randomBytes(byteLength).toString('hex');
}

export function generateOrderNo(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `PRXE-${date}-${rand}`;
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
