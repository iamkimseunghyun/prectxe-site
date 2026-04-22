import { createResendClient } from './resend';

const DEFAULT_SEGMENT_NAME = 'Newsletter';

let cachedSegmentId: string | null = null;

/**
 * 뉴스레터용 기본 Segment ID 조회/생성 — 모듈 레벨 캐시.
 *
 * Resend 2026부터 Audiences는 Segments로 이름이 변경됐고,
 * Broadcasts API는 segment_id가 필수. 계정당 "뉴스레터" 세그먼트를
 * 한 번만 생성해두고 모든 구독자를 이 세그먼트에 넣어 발송에 사용.
 *
 * env: RESEND_SEGMENT_NAME (기본 'Newsletter')
 */
export async function getOrCreateNewsletterSegmentId(): Promise<string> {
  if (cachedSegmentId) return cachedSegmentId;

  const resend = createResendClient();
  const name = process.env.RESEND_SEGMENT_NAME || DEFAULT_SEGMENT_NAME;

  const list = await resend.segments.list();
  if (list.error) {
    throw new Error(`Resend segments list 실패: ${list.error.message}`);
  }

  const found = list.data?.data.find((s) => s.name === name);
  if (found) {
    cachedSegmentId = found.id;
    return found.id;
  }

  const created = await resend.segments.create({ name });
  if (created.error || !created.data) {
    throw new Error(
      `Resend segment 생성 실패: ${created.error?.message ?? 'no data'}`
    );
  }

  cachedSegmentId = created.data.id;
  return created.data.id;
}
