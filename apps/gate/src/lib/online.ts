import { useNetInfo } from '@react-native-community/netinfo';

/**
 * 기기가 네트워크에 붙어 있는지. 확실히 끊긴 경우(false)만 오프라인으로 본다 —
 * 아직 모르는 상태(null)에서는 서버를 시도하고, 서버가 답하지 않으면 그때
 * 기기 명단으로 넘어간다.
 */
export function useNetworkUp(): boolean {
  const { isConnected, isInternetReachable } = useNetInfo();
  return isConnected !== false && isInternetReachable !== false;
}
