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
