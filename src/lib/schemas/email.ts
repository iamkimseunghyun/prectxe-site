import { z } from 'zod';

/**
 * 한 캠페인에서 허용할 최대 수신자 수.
 * 상한이 없으면 어드민 세션 하나로 임의 규모 발송이 가능하고,
 * 실수로 거대한 목록을 붙여넣었을 때 되돌릴 방법이 없다.
 */
export const MAX_CAMPAIGN_RECIPIENTS = 2000;

/**
 * 본문 길이 상한(서버 백스톱).
 * 에디터가 base64 이미지를 허용하므로 정상 본문도 커질 수 있어 느슨하게 잡되,
 * DB `body` 컬럼과 발송 페이로드가 무한정 커지는 것은 막는다.
 */
const MAX_BODY_LENGTH = 200_000;

const campaignBaseFields = {
  title: z
    .string()
    .trim()
    .min(1, '캠페인 제목을 입력해주세요')
    .max(200, '캠페인 제목은 200자 이하여야 합니다'),
  subject: z
    .string()
    .trim()
    .min(1, '이메일 제목을 입력해주세요')
    .max(200, '이메일 제목은 200자 이하여야 합니다'),
  body: z
    .string()
    .trim()
    .min(1, '내용을 입력해주세요')
    .max(MAX_BODY_LENGTH, '내용이 너무 깁니다'),
};

/**
 * 캠페인 발송 입력.
 *
 * 수신자 출처(`source`)를 명시적으로 구분한다:
 * - `form`  — 서버가 formId로 응답자 주소를 직접 조회한다.
 *             클라이언트가 보낸 주소 목록은 신뢰하지 않는다.
 * - `manual` — 어드민이 직접 입력/업로드한 목록.
 */
export const emailCampaignSchema = z.discriminatedUnion('source', [
  z.object({
    ...campaignBaseFields,
    source: z.literal('form'),
    formId: z.string().min(1, 'Form을 선택해주세요'),
  }),
  z.object({
    ...campaignBaseFields,
    source: z.literal('manual'),
    emails: z
      .array(z.string())
      .min(1, '수신자를 입력해주세요')
      .max(
        MAX_CAMPAIGN_RECIPIENTS,
        `수신자는 한 번에 최대 ${MAX_CAMPAIGN_RECIPIENTS}명까지 가능합니다`
      ),
  }),
]);

export type EmailCampaignInput = z.infer<typeof emailCampaignSchema>;

/** 뉴스레터 브로드캐스트 입력 — 수신자는 Resend 세그먼트가 결정한다. */
export const newsletterBroadcastSchema = z.object(campaignBaseFields);

export type NewsletterBroadcastInput = z.infer<
  typeof newsletterBroadcastSchema
>;

/**
 * 수신 거부 입력.
 * 메일의 링크로 오면 token, 링크가 깨졌을 때 페이지에서 직접 입력하면 email.
 */
export const unsubscribeSchema = z.union([
  z.object({ token: z.string().min(1) }),
  z.object({ email: z.string().email('올바른 이메일 주소를 입력해주세요') }),
]);
