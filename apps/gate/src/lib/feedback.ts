import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';
import type { Verdict } from './judge';

// 시끄러운 공연장에서는 소리보다 손에 오는 진동이 확실하다. 입장은 짧게,
// 거절은 길게 — 화면을 보지 않아도 구분되게 (PRD FR-3)
export function vibrate(color: Verdict['color']) {
  if (color === 'green') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else if (color === 'red') {
    // iOS는 길이를 지정할 수 없고 기본 진동(약 0.4초)이 가장 길다
    Vibration.vibrate(Platform.OS === 'android' ? 500 : undefined);
  } else {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}
