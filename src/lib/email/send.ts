import { ReactElement } from 'react';
import { createResendClient, getSenderEmail } from './resend';
import FormNotification from './templates/form-notification';
import Newsletter from './templates/newsletter';

// 이메일 발송 인터페이스
export interface SendEmailParams {
  to: string | string[]; // 단일 이메일 또는 이메일 배열
  subject: string;
  template: 'form-notification' | 'newsletter';
  data: any; // 템플릿 props
}

export interface SendEmailResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  results: {
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
}

/**
 * 템플릿 선택
 */
function getTemplate(template: string, data: any): ReactElement {
  switch (template) {
    case 'form-notification':
      return FormNotification(data);
    case 'newsletter':
      return Newsletter(data);
    default:
      return FormNotification(data);
  }
}

/**
 * 단일 또는 다수의 수신자에게 이메일 발송
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  try {
    const client = createResendClient();
    const from = getSenderEmail();
    const recipients = Array.isArray(params.to) ? params.to : [params.to];
    const results: SendEmailResult['results'] = [];
    let sentCount = 0;
    let failedCount = 0;

    // 각 수신자에게 개별 발송
    for (const email of recipients) {
      try {
        const response = await client.emails.send({
          from,
          to: email,
          subject: params.subject,
          react: getTemplate(params.template, params.data),
        });

        results.push({
          to: email,
          success: true,
          messageId: response.data?.id,
        });
        sentCount++;
      } catch (error) {
        results.push({
          to: email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failedCount++;
      }
    }

    return {
      success: sentCount > 0,
      sentCount,
      failedCount,
      results,
    };
  } catch (error) {
    console.error('이메일 발송 오류:', error);
    throw error;
  }
}

/**
 * 이메일 주소 형식 검증
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 배열에서 유효한 이메일만 필터링
 */
export function filterValidEmails(emails: string[]): string[] {
  return emails
    .map((e) => e.trim().toLowerCase())
    .filter(validateEmail)
    .filter((email, index, self) => self.indexOf(email) === index); // 중복 제거
}
