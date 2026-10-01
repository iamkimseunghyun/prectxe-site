/**
 * 인스턴스 로컬 슬라이딩 윈도우 rate limiter.
 *
 * Vercel Fluid Compute는 함수 인스턴스를 동시 요청 간 재사용하므로 단일
 * 발신지의 버스트는 대부분 같은 인스턴스에 몰린다. 즉 "공개 액션이 외부 API를
 * 무제한으로 증폭시키는 것"을 막는 데는 충분하다.
 *
 * 한계(의도된 트레이드오프):
 * - 인스턴스 간 공유 안 됨 → 분산된 저속 공격은 통과할 수 있다
 * - 재배포·스케일아웃 시 카운터 초기화
 * - MAX_KEYS 초과 시 오래된 버킷을 버리므로 상한이 느슨해질 수 있다
 *
 * 정밀한 방어가 필요해지면 Vercel Firewall rate limit 규칙(엣지)이나
 * Redis 백엔드로 교체할 것. 인터페이스는 그대로 유지되게 설계했다.
 */

/** 버킷 수 상한 — 무작위 키 유입으로 메모리가 무한정 늘지 않게 막는다. */
const MAX_KEYS = 10_000;

/** key → 윈도우 안에 기록된 호출 시각(ms) 배열 */
const buckets = new Map<string, number[]>();

/**
 * 기록하지 않고 현재 한도 초과 여부만 확인한다.
 *
 * "작업이 실제로 성사됐을 때만 예산을 소모"해야 하는 경우
 * `checkRateLimit`과 짝으로 쓴다 — 먼저 이 함수로 막힌 상태인지 보고,
 * 작업 성공 후에 `checkRateLimit`으로 기록한다. 그렇게 하지 않으면 작업이
 * 실패했는데 예산만 소모돼 재시도가 영영 막힌다.
 *
 * 두 호출 사이에 경쟁 상태가 생길 수 있으므로, 중복 실행이 무해한
 * (idempotent) 작업에만 쓸 것.
 *
 * @returns true면 이미 한도 초과(차단해야 함), false면 여유 있음
 */
export function isRateLimited(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const cutoff = Date.now() - windowMs;
  const recent = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  return recent.length >= limit;
}

/**
 * 호출을 1회 기록하고 허용 여부를 반환한다.
 *
 * @param key      제한 단위(예: `subscribe:ip:1.2.3.4`)
 * @param limit    윈도우당 최대 허용 횟수
 * @param windowMs 윈도우 길이(ms)
 * @returns true면 허용(호출이 기록됨), false면 한도 초과(기록되지 않음)
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;

  const recent = (buckets.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= limit) {
    // 만료분을 덜어낸 상태로 되돌려 둔다(윈도우가 흐르면 자연히 풀리도록).
    buckets.set(key, recent);
    return false;
  }

  recent.push(now);
  buckets.set(key, recent);

  if (buckets.size > MAX_KEYS) {
    evict(now);
  }

  return true;
}

/**
 * 만료된 버킷을 정리한다. 그래도 상한을 넘으면 삽입 순서가 오래된 것부터 버린다.
 * (Map은 삽입 순서를 보존하고, 기존 키에 set을 해도 순서가 바뀌지 않는다)
 */
function evict(now: number): void {
  for (const [key, timestamps] of buckets) {
    // 가장 최근 호출조차 하루가 지났으면 어떤 윈도우에도 걸리지 않는다.
    if (
      timestamps.length === 0 ||
      now - timestamps[timestamps.length - 1] > 86_400_000
    ) {
      buckets.delete(key);
    }
  }

  if (buckets.size <= MAX_KEYS) return;

  const overflow = buckets.size - MAX_KEYS;
  let dropped = 0;
  for (const key of buckets.keys()) {
    if (dropped >= overflow) break;
    buckets.delete(key);
    dropped++;
  }
}

/** 테스트·로컬 검증용 초기화. */
export function resetRateLimits(): void {
  buckets.clear();
}
