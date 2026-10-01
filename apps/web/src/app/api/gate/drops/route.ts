import type { GateDropsResponse } from '@prectxe/gate-contract';
import { json, requireStaff } from '@/modules/gate/server/http';
import { listStaffDrops } from '@/modules/gate/server/queries';

export async function GET(request: Request) {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth.response;
  const drops = await listStaffDrops(auth.staff.id);
  return json<GateDropsResponse>({ drops });
}
