import type { ReactElement } from 'react';
import { createResendClient, getSenderEmail } from './resend';
import BankTransferPending from './templates/bank-transfer-pending';
import FormNotification from './templates/form-notification';
import Newsletter from './templates/newsletter';
import OrderAdminNotification from './templates/order-admin-notification';
import OrderConfirmation from './templates/order-confirmation';

// 각 템플릿이 받는 props의 합집합 — 실제 페이로드 형태
export type EmailTemplateData =
  | Parameters<typeof FormNotification>[0]
  | Parameters<typeof Newsletter>[0]
  | Parameters<typeof OrderConfirmation>[0]
  | Parameters<typeof BankTransferPending>[0]
  | Parameters<typeof OrderAdminNotification>[0];

// 이메일 발송 인터페이스
export interface SendEmailParams {
  to: string | string[];
  subject: string;
  template:
    | 'form-notification'
    | 'newsletter'
    | 'order-confirmation'
    | 'bank-transfer-pending'
    | 'order-admin-notification';
  data: EmailTemplateData;
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
function getTemplate(template: string, data: EmailTemplateData): ReactElement {
  switch (template) {
    case 'form-notification':
      return FormNotification(data as Parameters<typeof FormNotification>[0]);
    case 'newsletter':
      return Newsletter(data as Parameters<typeof Newsletter>[0]);
    case 'order-confirmation':
      return OrderConfirmation(data as Parameters<typeof OrderConfirmation>[0]);
    case 'bank-transfer-pending':
      return BankTransferPending(
        data as Parameters<typeof BankTransferPending>[0]
      );
    case 'order-admin-notification':
      return OrderAdminNotification(
        data as Parameters<typeof OrderAdminNotification>[0]
      );
    default:
      return FormNotification(data as Parameters<typeof FormNotification>[0]);
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
