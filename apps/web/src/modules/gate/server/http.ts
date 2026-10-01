import type { ApiError } from '@prectxe/gate-contract';
import type { z } from 'zod';
import {
  getStaffFromRequest,
  isStaffAssigned,
  type StaffIdentity,
} from './auth';

// 게이트 API Route Handler 공용 도우미. 응답은 전부 JSON이고 캐시하지 않는다.

export function json<T>(body: T, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export function apiError(message: string, status: number): Response {
  return json<ApiError>({ error: message }, status);
}

type Parsed<T> = { ok: true; data: T } | { ok: false; response: Response };

export async function parseBody<S extends z.ZodType>(
  request: Request,
  schema: S
): Promise<Parsed<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: apiError('잘못된 요청입니다.', 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      response: apiError(
        parsed.error.issues[0]?.message ?? '잘못된 요청입니다.',
        400
      ),
    };
  return { ok: true, data: parsed.data };
}

export async function requireStaff(
  request: Request
): Promise<
  { ok: true; staff: StaffIdentity } | { ok: false; response: Response }
> {
  const staff = await getStaffFromRequest(request);
  if (!staff)
    return { ok: false, response: apiError('로그인이 필요합니다.', 401) };
  return { ok: true, staff };
}

/** 로그인 + 이 행사에 배정됐는지까지. 행사별 API는 매 요청 이걸 거친다 */
export async function requireStaffForDrop(
  request: Request,
  dropId: string
): Promise<
  { ok: true; staff: StaffIdentity } | { ok: false; response: Response }
> {
  const auth = await requireStaff(request);
  if (!auth.ok) return auth;
  if (!(await isStaffAssigned(auth.staff.id, dropId)))
    return {
      ok: false,
      response: apiError('이 행사에 배정되지 않았습니다.', 403),
    };
  return auth;
}
