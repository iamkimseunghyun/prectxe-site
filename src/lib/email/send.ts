import type { ReactElement } from 'react';
import { render } from 'react-email';
import { maskEmail } from '@/lib/utils/text';
import { createResendClient, getSenderEmail } from './resend';
import BankTransferPending from './templates/bank-transfer-pending';
import FormNotification from './templates/form-notification';
import Newsletter from './templates/newsletter';
import OrderAdminNotification from './templates/order-admin-notification';
import OrderConfirmation from './templates/order-confirmation';
import {
  buildUnsubscribeHeaders,
  getUnsubscribePageUrl,
  UNSUBSCRIBE_URL_PLACEHOLDER,
} from './unsubscribe';

// 각 템플릿이 받는 props의 합집합 — 실제 페이로드 형태
export type EmailTemplateData =
  | Parameters<typeof FormNotification>[0]
  | Parameters<typeof Newsletter>[0]
  | Parameters<typeof OrderConfirmation>[0]
  | Parameters<typeof BankTransferPending>[0]
  | Parameters<typeof OrderAdminNotification>[0];

/** Resend batch API 1회 요청당 최대 수신자 수 */
const BATCH_SIZE = 100;

/**
 * 청크 사이 최소 간격.
 * Resend rate limit은 팀당 10 req/s를 모든 API 키가 공유하므로, 대량 발송이
 * 예산을 독점해 주문 확인·입금 안내 메일을 밀어내지 않도록 간격을 둔다.
 */
const BATCH_INTERVAL_MS = 150;

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
  /**
   * 지정하면 청크마다 `${idempotencyKey}:${index}` 형태의 Idempotency-Key를
   * 붙인다. 발송 도중 타임아웃·크래시로 같은 캠페인을 재실행해도 Resend가
   * 이미 처리한 청크를 중복 발송하지 않는다.
   */
  idempotencyKey?: string;
  /**
   * true면 수신자별 List-Unsubscribe 헤더를 붙이고, 본문의
   * `UNSUBSCRIBE_URL_PLACEHOLDER`를 그 수신자의 해지 URL로 치환한다.
   *
   * **광고성·안내성 단체 메일에만 쓴다.** 주문 확인·입금 안내 같은 거래 메일에
   * 수신 거부를 붙이면 구매자가 영수증 수신을 해지하는 셈이 된다.
   */
  includeUnsubscribe?: boolean;
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

/** 배열을 size 단위로 자른다. */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 단일 또는 다수의 수신자에게 이메일 발송.
 *
 * 수신자마다 개별 요청을 보내는 대신 Resend batch API로 100건씩 묶어 보낸다.
 * 500명 기준 API 호출이 500회에서 5회로 줄고, 템플릿 렌더도 500회에서 1회가 된다.
 */
export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const recipients = Array.isArray(params.to) ? params.to : [params.to];

  if (recipients.length === 0) {
    return { success: false, sentCount: 0, failedCount: 0, results: [] };
  }

  // 템플릿은 수신자와 무관하게 동일하므로 한 번만 렌더한다.
  // (SDK에 react를 넘기면 수신자마다 다시 렌더된다)
  let html: string;
  try {
    html = await render(getTemplate(params.template, params.data));
  } catch (err) {
    // 렌더가 깨지면 누구에게도 보낼 수 없다 — 전원 실패로 보고한다.
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[email] 템플릿 렌더 실패', {
      template: params.template,
      error: message,
    });
    return {
      success: false,
      sentCount: 0,
      failedCount: recipients.length,
      results: recipients.map((to) => ({
        to,
        success: false,
        error: `템플릿 렌더 실패: ${message}`,
      })),
    };
  }

  const client = createResendClient();
  const from = getSenderEmail();
  const results: SendEmailResult['results'] = [];
  let sentCount = 0;
  let failedCount = 0;

  const groups = chunk(recipients, BATCH_SIZE);

  for (const [chunkIndex, group] of groups.entries()) {
    if (chunkIndex > 0) await sleep(BATCH_INTERVAL_MS);

    // Resend SDK는 API 에러를 throw하지 않고 { data: null, error }로 반환한다.
    const { data, error } = await client.batch.send(
      group.map((to) => ({
        from,
        to,
        subject: params.subject,
        // 본문은 한 번만 렌더했으므로 수신자별 URL은 자리표시자 치환으로 넣는다.
        // 50KB 문자열 치환은 React 렌더에 비하면 무시할 만한 비용이다.
        html: params.includeUnsubscribe
          ? html.replaceAll(
              UNSUBSCRIBE_URL_PLACEHOLDER,
              getUnsubscribePageUrl(to)
            )
          : html,
        headers: params.includeUnsubscribe
          ? buildUnsubscribeHeaders(to)
          : undefined,
      })),
      {
        // strict(기본값)는 잘못된 주소 하나가 청크 전체를 실패시킨다.
        // permissive는 실패한 항목만 errors[]로 돌려주고 나머지는 발송한다.
        batchValidation: 'permissive',
        idempotencyKey: params.idempotencyKey
          ? `${params.idempotencyKey}:${chunkIndex}`
          : undefined,
      }
    );

    if (error || !data) {
      // 청크 전체 실패 — 429, 도메인 미인증, 네트워크 오류 등.
      const message = error
        ? `${error.name}: ${error.message}`
        : 'Unknown batch error';
      console.error('[email] 배치 발송 실패', {
        template: params.template,
        chunkIndex,
        size: group.length,
        error: message,
      });
      for (const to of group) {
        results.push({ to, success: false, error: message });
        failedCount++;
      }
      continue;
    }

    // permissive 응답에서 errors[].index는 **요청 배열 기준** 인덱스이고,
    // data[]에는 성공한 건만 순서대로 담긴다.
    const failures = new Map<number, string>();
    for (const e of data.errors ?? []) {
      failures.set(e.index, e.message);
    }

    // 길이가 예상과 어긋나면 위치 기반 매핑을 신뢰하지 않는다.
    // 발송 성패 자체는 errors[]로 확정되므로 messageId만 포기하면 된다.
    const idsAligned = data.data.length === group.length - failures.size;
    if (!idsAligned) {
      console.warn('[email] 배치 응답 길이 불일치 — messageId 매핑 생략', {
        chunkIndex,
        requested: group.length,
        returned: data.data.length,
        failed: failures.size,
      });
    }

    let cursor = 0;
    group.forEach((to, i) => {
      const failure = failures.get(i);
      if (failure !== undefined) {
        // 수신자 주소는 마스킹한다 — 원인 추적엔 도메인이면 충분하고,
        // 전체 주소를 남기면 런타임 로그가 개인정보 저장소가 된다.
        console.error('[email] 발송 실패', {
          to: maskEmail(to),
          template: params.template,
          error: failure,
        });
        results.push({ to, success: false, error: failure });
        failedCount++;
        return;
      }

      const messageId = idsAligned ? data.data[cursor]?.id : undefined;
      cursor++;
      results.push({ to, success: true, messageId });
      sentCount++;
    });
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
 * 배열에서 유효한 이메일만 필터링 + 중복 제거.
 *
 * 중복 제거에 `indexOf`를 쓰면 O(n²)이라 폼 응답자가 수천 건일 때 눈에 띄게
 * 느려진다. Set은 삽입 순서를 보존하므로 결과 순서도 그대로다.
 */
export function filterValidEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of emails) {
    const email = raw.trim().toLowerCase();
    if (validateEmail(email)) seen.add(email);
  }
  return [...seen];
}
