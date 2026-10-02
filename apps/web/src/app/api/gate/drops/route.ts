import type { GateDropsResponse } from '@prectxe/gate-contract';
import { json, requireStaff } from '@/modules/gate/server/http';
import { listStaffDrops } from '@/modules/gate/server/queries';

// DB 옆(싱가포르)에서 실행 — 이유는 CLAUDE.md '게이트 앱 API' 리전 항목
export const preferredRegion = 'sin1';

export async function GET(request: Request) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;
  const drops = await listStaffDrops(auth.staff.id);
  return json<GateDropsResponse>({ drops });
}
