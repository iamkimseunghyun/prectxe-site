import { headers } from 'next/headers';

/**
 * 클라이언트 IP.
 *
 * Vercel은 `x-forwarded-for`를 **덮어쓰고 외부에서 들어온 값을 전달하지 않는다**
 * (Enterprise trusted proxy 예외) — 즉 이 배포 환경에서 이 헤더는 스푸핑되지
 * 않는다. 반면 `x-real-ip`는 Vercel이 관리하지 않아 클라이언트가 임의 값을
 * 넣을 수 있으므로 폴백으로도 쓰지 않는다(넣으면 한도를 무한정 우회당한다).
 *
 * 헤더가 없으면 'unknown' 공용 버킷으로 묶어 한도를 함께 쓰게 한다 —
 * 제한 없이 통과시키는 것보다 안전한 실패 방향이다.
 *
 * 공개 액션은 이 함수로 직접 IP를 읽어야 한다. 서버액션은 공개 RPC라
 * 인자로 받은 IP는 호출자가 마음대로 정할 수 있다.
 *
 * @see https://vercel.com/docs/headers/request-headers
 */
export async function getClientIp(): Promise<string> {
  const forwarded = (await headers()).get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}
