import type { ReactElement } from 'react';
import { maskEmail } from '@/lib/utils/text';
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
  const client = createResendClient();
  const from = getSenderEmail();
  const recipients = Array.isArray(params.to) ? params.to : [params.to];
  const results: SendEmailResult['results'] = [];
  let sentCount = 0;
  let failedCount = 0;

  // 각 수신자에게 개별 발송
  for (const email of recipients) {
    try {
      // Resend SDK는 API 에러를 throw하지 않고 { data: null, error }로 반환한다.
      // (resend/dist fetchRequest가 모든 실패를 catch해서 error 필드에 담음)
      // 따라서 try/catch만으로는 429·422·403·네트워크 실패를 전혀 감지하지 못한다.
      const { data, error } = await client.emails.send({
        from,
        to: email,
        subject: params.subject,
        react: getTemplate(params.template, params.data),
      });

      if (error) {
        const message = `${error.name}: ${error.message}`;
        // 주문 확인·입금 안내 메일도 이 경로를 타므로 실패는 반드시 로그에 남긴다.
        // 수신자 주소는 마스킹한다 — 실패 원인 추적에는 도메인이면 충분하고,
        // 전체 주소를 남기면 런타임 로그가 개인정보 저장소가 된다.
        console.error('[email] 발송 실패', {
          to: maskEmail(email),
          template: params.template,
          error: message,
        });
        results.push({ to: email, success: false, error: message });
        failedCount++;
        continue;
      }

      results.push({ to: email, success: true, messageId: data?.id });
      sentCount++;
    } catch (err) {
      // 여기 걸리는 건 주로 템플릿 렌더 실패 등 SDK 호출 이전 예외.
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[email] 발송 예외', {
        to: maskEmail(email),
        template: params.template,
        error: message,
      });
      results.push({ to: email, success: false, error: message });
      failedCount++;
    }
  }

  return {
    // 한 건이라도 실패하면 success가 아니다. 예전엔 sentCount > 0이라
    // 500명 중 1명만 성공해도 "성공"으로 보고됐다.
    success: failedCount === 0 && sentCount > 0,
    sentCount,
    failedCount,
    results,
  };
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
