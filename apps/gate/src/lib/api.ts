import { type ApiError, GATE_API_PREFIX } from '@prectxe/gate-contract';

// 개발 중엔 EXPO_PUBLIC_API_URL로 로컬 서버(예: http://localhost:3000)를 가리킨다
const BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? 'https://www.prectxe.com'
).replace(/\/+$/, '');

// 신호가 약한 곳에서는 요청이 실패하지도 않고 OS 기본값(iOS 60초)까지 매달린다.
// 그동안 화면이 멈춰 있느니 빨리 실패하고 오프라인으로 처리하는 편이 낫다
const DEFAULT_TIMEOUT_MS = 10_000;

const NETWORK_ERROR = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';

/** `status`가 0이면 서버에 닿지 못했거나 응답을 읽지 못했다 (오프라인으로 취급) */
export class GateApiError extends Error {
  readonly status: number;
  /** 연결은 됐는데 제한 시간 안에 답이 없었다 — 서버가 꺼진 게 아니라 느린 것 */
  readonly timedOut: boolean;

  constructor(status: number, message: string, timedOut = false) {
    super(message);
    this.status = status;
    this.timedOut = timedOut;
  }
}

/**
 * 서버가 판정·응답을 못 한 경우 — 네트워크·타임아웃·서버 오류(5xx). 이때는
 * 기기에 저장된 것(행사 목록·명단)으로 계속 일한다. 4xx는 서버가 내린 답이다.
 */
export function isUnreachable(error: unknown): error is GateApiError {
  return (
    error instanceof GateApiError && (error.status === 0 || error.status >= 500)
  );
}

export type RequestOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
  /** 화면을 떠나면 요청을 끊는다 (react-query의 queryFn signal) */
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function api<T>(
  path: string,
  {
    method = 'GET',
    body,
    token,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: RequestOptions = {}
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abort = () => controller.abort();
  // 이미 끊긴 signal에는 abort 이벤트가 다시 오지 않는다
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', abort);

  let res: Response;
  let data: unknown;
  try {
    res = await fetch(`${BASE_URL}${GATE_API_PREFIX}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    data = await res.json().catch(() => null);
  } catch {
    throw timedOut
      ? new GateApiError(0, '서버 응답이 늦습니다.', true)
      : new GateApiError(0, NETWORK_ERROR);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }

  // 본문을 읽는 도중 시간이 다 된 경우도 느린 응답이다
  if (timedOut) throw new GateApiError(0, '서버 응답이 늦습니다.', true);
  if (!res.ok)
    throw new GateApiError(
      res.status,
      (data as ApiError | null)?.error ?? `요청에 실패했습니다 (${res.status})`
    );
  // 성공 응답인데 JSON이 아니면 우리 서버가 답한 게 아니다 — 와이파이 로그인
  // 페이지(캡티브 포털)가 가로챈 경우다. 오프라인과 같게 처리한다
  if (data === null || typeof data !== 'object')
    throw new GateApiError(
      0,
      '서버 응답을 읽을 수 없습니다. 와이파이 로그인이 필요한지 확인해주세요.'
    );
  return data as T;
}
