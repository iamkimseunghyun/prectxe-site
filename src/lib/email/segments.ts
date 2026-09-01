import { createResendClient } from './resend';

const DEFAULT_SEGMENT_NAME = 'Newsletter';
/** segments.list 한 페이지 크기 (Resend 최대 100) */
const LIST_PAGE_SIZE = 100;

let cachedSegmentId: string | null = null;

/**
 * 뉴스레터용 Segment ID.
 *
 * Resend 2026부터 Audiences는 Segments로 이름이 바뀌었고 Broadcasts API는
 * segment_id가 필수다. 계정당 "뉴스레터" 세그먼트 하나에 모든 구독자를 넣는다.
 *
 * **`RESEND_SEGMENT_ID`를 설정하는 것을 권장한다.** 자동 탐지에는 구조적인
 * 약점이 있다:
 * - 모듈 캐시라 무효화 경로가 없다 → 세그먼트를 지우거나 이름을 바꾸면
 *   재배포 전까지 발송이 막힌다
 * - 콜드 인스턴스가 동시에 뜨면 각자 "없다"고 판단해 같은 이름의 세그먼트를
 *   중복 생성할 수 있다 → 구독자가 둘로 쪼개진다
 * - 이름으로 찾으므로 대시보드에서 이름을 바꾸면 새로 만들어 버린다
 *
 * env: `RESEND_SEGMENT_ID`(권장) > `RESEND_SEGMENT_NAME`(기본 'Newsletter')
 */
export async function getOrCreateNewsletterSegmentId(): Promise<string> {
  // ID가 고정돼 있으면 API 호출도, 레이스도, 이름 의존도 없다.
  const configured = process.env.RESEND_SEGMENT_ID?.trim();
  if (configured) return configured;

  if (cachedSegmentId) return cachedSegmentId;

  const resend = createResendClient();
  const name = process.env.RESEND_SEGMENT_NAME || DEFAULT_SEGMENT_NAME;

  // 전 페이지를 순회한다. 예전엔 첫 페이지만 보고 없으면 새로 만들어서,
  // 세그먼트가 기본 페이지 크기를 넘어가면 중복 생성될 수 있었다.
  let after: string | undefined;
  for (;;) {
    const list = await resend.segments.list({ limit: LIST_PAGE_SIZE, after });
    if (list.error) {
      throw new Error(`Resend segments list 실패: ${list.error.message}`);
    }

    const found = list.data?.data.find((s) => s.name === name);
    if (found) {
      cachedSegmentId = found.id;
      return found.id;
    }

    const page = list.data?.data ?? [];
    if (!list.data?.has_more || page.length === 0) break;
    after = page[page.length - 1]?.id;
    if (!after) break;
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
