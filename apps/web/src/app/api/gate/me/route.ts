import type { MeResponse } from '@prectxe/gate-contract';
import { json, requireStaff } from '@/modules/gate/server/http';

// DB 옆(싱가포르)에서 실행 — 이유는 CLAUDE.md '게이트 앱 API' 리전 항목
export const preferredRegion = 'sin1';

/** 앱 시작 시 저장된 토큰이 아직 유효한지 확인하는 용도 */
export async function GET(request: Request) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;
  return json<MeResponse>({ staff: auth.staff });
}
