import { Resend } from 'resend';

// Resend 클라이언트 생성
export function createResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error('RESEND_API_KEY must be set');
  }

  return new Resend(apiKey);
}

// 발신 이메일 주소
export function getSenderEmail() {
  return process.env.RESEND_SENDER_EMAIL || 'noreply@prectxe.com';
}

/**
 * 수신 거부 링크 플레이스홀더 — **Broadcasts 전용**.
 *
 * Resend가 브로드캐스트 수신자별로 고유 링크를 만들어 치환한다.
 * `emails.send`(트랜잭셔널) 경로에서는 치환이 일어나지 않아 이 문자열이
 * 그대로 href에 박힌 죽은 링크가 발송되므로 절대 넘기지 말 것.
 * 트랜잭셔널 메일의 수신 거부는 List-Unsubscribe 헤더로 처리해야 한다.
 *
 * @see https://resend.com/docs/dashboard/broadcasts/editor
 */
export const RESEND_UNSUBSCRIBE_PLACEHOLDER = '{{{RESEND_UNSUBSCRIBE_URL}}}';
