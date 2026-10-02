import { revokeStaffSession } from '@/modules/gate/server/auth';
import { json } from '@/modules/gate/server/http';

export async function POST(request: Request) {
  await revokeStaffSession(request);
  return json({ ok: true });
}
