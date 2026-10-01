import { type ApiError, GATE_API_PREFIX } from '@prectxe/gate-contract';

// 개발 중엔 EXPO_PUBLIC_API_URL로 로컬 서버(예: http://localhost:3000)를 가리킨다
const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'https://www.prectxe.com'
).replace(/\/+$/, '');

export class GateApiError extends Error {
  /** 0이면 서버에 닿지 못했다 (오프라인·타임아웃) */
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

export async function api<T>(
  path: string,
  { method = 'GET', body, token, signal }: RequestOptions = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${GATE_API_PREFIX}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch {
    throw new GateApiError(
      0,
      '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.'
    );
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok)
    throw new GateApiError(
      res.status,
      (data as ApiError | null)?.error ?? `요청에 실패했습니다 (${res.status})`
    );
  return data as T;
}
