/**
 * 주문·티켓 식별자 / 토큰 생성 (서버 전용 — `node:crypto` 의존).
 *
 * - Order.orderNo: 사람이 읽는 주문번호 (PRXE-YYYYMMDD-XXXXXX, 비유추적이지 않음)
 * - Order.accessToken: /tickets/order/[accessToken] 마이페이지 접근용 (unguessable)
 * - Ticket.token: QR 페이로드 (스캔 시 입장 검증용, unguessable)
 *
 * accessToken / ticketToken은 randomBytes(16) → hex 32자 (≈128 bits).
 *
 * 공개 URL 빌더·QR 파서는 클라이언트에서도 쓰이므로 `ticket-url.ts`에 있다.
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
