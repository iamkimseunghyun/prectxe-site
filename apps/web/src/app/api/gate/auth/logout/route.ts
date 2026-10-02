import { revokeStaffSession } from '@/modules/gate/server/auth';
import { json } from '@/modules/gate/server/http';

// DB 옆(싱가포르)에서 실행 — 이유는 CLAUDE.md '게이트 앱 API' 리전 항목
export const preferredRegion = 'sin1';

export async function POST(request: Request) {
  await revokeStaffSession(request);
  return json({ ok: true });
}
