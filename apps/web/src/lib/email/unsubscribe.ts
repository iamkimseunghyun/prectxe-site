import { createHmac, timingSafeEqual } from 'node:crypto';
import { BUSINESS_INFO } from '@/lib/constants/business-info';
import { createResendClient } from './resend';

/**
 * 수신 거부 토큰.
 *
 * 상태를 저장하지 않는 HMAC 토큰이다 — 구독자 모델이 자체 DB에 없고(구독자는
 * Resend가 관리) 이미 발송된 메일의 링크는 몇 년 뒤에도 동작해야 하므로,
 * DB 조회 없이 검증 가능한 서명 토큰이 맞다. 만료도 두지 않는다.
 *
 * 키는 `UNSUBSCRIBE_SECRET`이 있으면 그것을, 없으면 `COOKIE_PASSWORD`에서
 * 도메인 분리해 파생한다. 세션 시크릿을 그대로 쓰지 않는 이유는 용도별 키
 * 분리 원칙이고, 별도 env를 권장하는 이유는 **세션 시크릿을 로테이션하면
 * 그 전에 발송된 메일의 수신 거부 링크가 전부 깨지기 때문**이다.
 * 링크가 깨져도 /unsubscribe 페이지에서 주소를 직접 입력해 해지할 수 있어
 * 완전히 막히지는 않지만, 원클릭 해지는 동작하지 않는다.
 */
const TOKEN_PURPOSE = 'prectxe:unsubscribe:v1';

function getSigningKey(): Buffer {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.COOKIE_PASSWORD;
  if (!secret) {
    throw new Error('UNSUBSCRIBE_SECRET 또는 COOKIE_PASSWORD must be set');
  }
  return createHmac('sha256', secret).update(TOKEN_PURPOSE).digest();
}

function sign(payload: string): string {
  return createHmac('sha256', getSigningKey())
    .update(payload)
    .digest('base64url');
}

/** 수신자 주소를 담은 서명 토큰을 만든다. */
export function createUnsubscribeToken(email: string): string {
  const payload = Buffer.from(email.trim().toLowerCase(), 'utf8').toString(
    'base64url'
  );
  return `${payload}.${sign(payload)}`;
}

/** 토큰을 검증하고 이메일 주소를 돌려준다. 위조·손상이면 null. */
export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;

  const payload = token.slice(0, dot);
  const provided = token.slice(dot + 1);

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return null;
  }

  // 길이가 다르면 timingSafeEqual이 던지므로 먼저 걸러낸다.
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const email = Buffer.from(payload, 'base64url').toString('utf8');
  return email.includes('@') ? email : null;
}

/**
 * 본문에 심는 수신 거부 URL 자리표시자.
 *
 * 템플릿은 수신자 전체에 대해 **한 번만** 렌더하므로(대량 발송 성능) 본문에
 * 수신자별 URL을 직접 넣을 수 없다. 렌더된 HTML에서 이 문자열을 수신자별
 * URL로 치환한다 — Resend가 Broadcasts에서 쓰는 방식과 같다.
 */
export const UNSUBSCRIBE_URL_PLACEHOLDER = '__PRECTXE_UNSUBSCRIBE_URL__';

/** 사람이 클릭하는 수신 거부 페이지 URL(확인 후 해지). */
export function getUnsubscribePageUrl(email: string): string {
  const token = createUnsubscribeToken(email);
  return `${BUSINESS_INFO.serviceUrl}/unsubscribe?t=${encodeURIComponent(token)}`;
}

/**
 * List-Unsubscribe 헤더용 URL(원클릭 POST 수신).
 * 페이지가 아니라 라우트 핸들러를 가리킨다 — page.tsx는 POST를 처리할 수 없다.
 */
export function getUnsubscribeEndpointUrl(email: string): string {
  const token = createUnsubscribeToken(email);
  return `${BUSINESS_INFO.serviceUrl}/api/unsubscribe?t=${encodeURIComponent(token)}`;
}

/**
 * RFC 8058 원클릭 수신 거부 헤더.
 * Gmail·Yahoo는 대량 발신자에게 이 조합을 요구하고, 그 미만 규모에서도
 * 스팸 신고 대신 수신 거부를 유도해 발신 도메인 평판에 도움이 된다.
 */
export function buildUnsubscribeHeaders(email: string): Record<string, string> {
  return {
    'List-Unsubscribe': `<${getUnsubscribeEndpointUrl(email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

/**
 * Resend contacts에서 수신 거부 처리.
 * 구독자 목록은 Resend가 소유하므로 자체 DB에 남길 상태가 없다.
 */
export async function unsubscribeContact(
  email: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const resend = createResendClient();
    const { error } = await resend.contacts.update({
      email: email.trim().toLowerCase(),
      unsubscribed: true,
    });

    if (error) {
      // 애초에 구독자가 아니었던 주소 — 사용자 입장에선 목적이 달성된 상태다.
      if (error.message?.toLowerCase().includes('not found')) {
        return { success: true };
      }
      console.error('[unsubscribe] resend update error', error);
      return {
        success: false,
        error: '수신 거부 처리 중 오류가 발생했습니다.',
      };
    }

    return { success: true };
  } catch (err) {
    console.error('[unsubscribe] unexpected error', err);
    return { success: false, error: '수신 거부 처리 중 오류가 발생했습니다.' };
  }
}
