import type { MeResponse, StaffProfile } from '@prectxe/gate-contract';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  const raw = await SecureStore.getItemAsync(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const clear = useCallback(async () => {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    setState({ status: 'signedOut' });
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await readSession();
      if (!saved) {
        setState({ status: 'signedOut' });
        return;
      }
      try {
        const { staff } = await api<MeResponse>('/me', { token: saved.token });
        setState({ status: 'signedIn', token: saved.token, staff });
      } catch (error) {
        // 서버가 세션을 거절했을 때만 로그아웃한다. 통신이 안 되는 건 공연장
        // 지하에서 앱을 다시 연 경우일 수 있다 — 저장된 로그인으로 들어간다.
        if (error instanceof GateApiError && error.status === 401) {
          await clear();
          return;
        }
        setState({ status: 'signedIn', ...saved });
      }
    })();
  }, [clear]);

  const signIn = useCallback(async (session: Session) => {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    setState({ status: 'signedIn', ...session });
  }, []);

  const token = state.status === 'signedIn' ? state.token : null;

  const signOut = useCallback(async () => {
    if (token)
      // 서버 세션도 지운다. 실패해도(오프라인) 기기에서는 로그아웃한다
      await api('/auth/logout', { method: 'POST', token }).catch(() => {});
    await clear();
  }, [token, clear]);

  const request = useCallback(
    async <T,>(path: string, options?: Omit<RequestOptions, 'token'>) => {
      try {
        return await api<T>(path, { ...options, token });
      } catch (error) {
        if (error instanceof GateApiError && error.status === 401)
          await clear();
        throw error;
      }
    },
    [token, clear]
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
