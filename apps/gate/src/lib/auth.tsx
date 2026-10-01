import type { MeResponse, StaffProfile } from '@prectxe/gate-contract';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api, GateApiError, type RequestOptions } from './api';

// 토큰과 스태프 정보를 함께 둔다 — 오프라인으로 앱을 열어도 누구로 로그인했는지
// 보여줘야 한다. SecureStore는 큰 값을 거부할 수 있어 필요한 것만 담는다.
const SESSION_KEY = 'gate.session';

type Session = { token: string; staff: StaffProfile };

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | ({ status: 'signedIn' } & Session);

type AuthContextValue = AuthState & {
  signIn(session: Session): Promise<void>;
  signOut(): Promise<void>;
  /** 로그인 토큰을 붙여 요청한다. 401이면 세션이 끝난 것이라 로그아웃시킨다 */
  request<T>(path: string, options?: Omit<RequestOptions, 'token'>): Promise<T>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function readSession(): Promise<Session | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<Session>;
    return typeof saved.token === 'string' && saved.staff
      ? (saved as Session)
      : null;
  } catch {
    // 키체인·Keystore를 못 읽으면(백업 복원 뒤 복호화 실패 등) 다시 로그인하게
    // 한다. 여기서 멈추면 앱이 스플래시에서 넘어가지 않는다
    await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  // 지금 로그인된 토큰. 응답이 늦게 온 옛 토큰의 401이 새 로그인을 지우지 않게
  // 세션을 끝낼 때 비교한다
  const currentToken = useRef<string | null>(null);

  const endSession = useCallback(
    async (token: string | null) => {
      if (token !== currentToken.current) return;
      currentToken.current = null;
      setState({ status: 'signedOut' });
      // 다음에 로그인한 사람에게 이전 계정의 행사 목록이 보이면 안 된다.
      // 진행 중인 요청도 끊는다 (요청에 signal이 넘어가 있다)
      void queryClient.cancelQueries();
      queryClient.clear();
      await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
    },
    [queryClient]
  );

  useEffect(() => {
    (async () => {
      const saved = await readSession();
      if (!saved) {
        setState({ status: 'signedOut' });
        return;
      }
      // 저장된 로그인으로 바로 연다. 서버 확인을 기다리면 신호가 약한 공연장에서
      // 스플래시에 멈춘다 — 확인은 뒤에서 하고, 서버가 세션을 거절할 때만 내보낸다
      currentToken.current = saved.token;
      setState({ status: 'signedIn', ...saved });
      try {
        const { staff } = await api<MeResponse>('/me', { token: saved.token });
        setState((prev) =>
          prev.status === 'signedIn' && prev.token === saved.token
            ? { ...prev, staff }
            : prev
        );
      } catch (error) {
        if (error instanceof GateApiError && error.status === 401)
          await endSession(saved.token);
      }
    })();
  }, [endSession]);

  const signIn = useCallback(
    async (session: Session) => {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
      queryClient.clear();
      currentToken.current = session.token;
      setState({ status: 'signedIn', ...session });
    },
    [queryClient]
  );

  const signOut = useCallback(async () => {
    const token = currentToken.current;
    await endSession(token);
    // 서버 세션도 지운다. 기다리지 않는다 — 오프라인이면 실패하지만 기기에서는
    // 이미 로그아웃됐다
    if (token) api('/auth/logout', { method: 'POST', token }).catch(() => {});
  }, [endSession]);

  const request = useCallback(
    async <T,>(path: string, options?: Omit<RequestOptions, 'token'>) => {
      const token = currentToken.current;
      try {
        return await api<T>(path, { ...options, token });
      } catch (error) {
        if (error instanceof GateApiError && error.status === 401)
          await endSession(token);
        throw error;
      }
    },
    [endSession]
  );

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signOut, request }),
    [state, signIn, signOut, request]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value)
    throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다.');
  return value;
}
