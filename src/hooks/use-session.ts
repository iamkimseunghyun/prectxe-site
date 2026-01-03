// hooks/useSession.ts
import { useQuery } from '@tanstack/react-query';
import type { SessionData } from '@/app/api/auth/session/route';

// API 응답 타입 import

// API 호출 함수 (NavBar에서 사용한 것과 동일)
const fetchSession = async (): Promise<SessionData> => {
  const response = await fetch('/api/auth/session');
  // 기본적인 네트워크 에러 외에, 4xx, 5xx 응답도 에러로 처리
  if (!response.ok) {
    // 401 Unauthorized 같은 특정 에러는 다르게 처리할 수도 있음
    // const errorData = await response.json().catch(() => ({})); // 에러 응답 본문 파싱 시도
    // console.error("Session fetch error:", response.status, errorData);
    throw new Error(
      `Failed to fetch session: ${response.statusText} (${response.status})`
    );
  }
  try {
    return await response.json();
  } catch (e) {
    // JSON 파싱 에러 처리
    console.error('Failed to parse session JSON:', e);
    throw new Error('Failed to parse session data');
  }
};

// 커스텀 훅 정의
export function useSession(initialData?: SessionData) {
  const { data, isLoading, isError, error } = useQuery<SessionData, Error>({
    queryKey: ['session'], // 일관된 쿼리 키 사용
    queryFn: fetchSession,
    initialData: initialData,
    staleTime: 5 * 60 * 1000, // 5분 (NavBar와 동일하게 또는 필요에 따라 조정)
    refetchOnWindowFocus: true,
    retry: 1, // 실패 시 재시도 횟수 (선택 사항)
    // 기본적으로 TanStack Query는 4xx 에러 시 재시도하지 않음
    // retry: (failureCount, error) => {
    //   if (error.message.includes('401')) return false; // 401 에러는 재시도 안 함
    //   return failureCount < 2; // 그 외는 최대 2번 재시도
    // },
  });

  // 파생된 상태 계산
  const isLoggedIn = data?.isLoggedIn ?? false;
  const user = data?.user ?? null;
  const isAdmin = user?.role === 'ADMIN';

  // 이 훅을 사용하는 컴포넌트에 유용한 값들을 반환
  return {
    session: data, // 원본 데이터가 필요할 경우
    user, // 사용자 객체 (로그인 안했으면 null)
    isLoggedIn, // 로그인 여부 boolean
    isAdmin, // 관리자 여부 boolean
    isLoading, // 로딩 상태
    isError, // 에러 발생 여부
    error, // 에러 객체 (발생 시)
  };
}
