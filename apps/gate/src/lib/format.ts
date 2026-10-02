// 행사 시각은 기기 시간대와 무관하게 한국 시간으로 보여준다
const dateTime = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatEventTime(iso: string | null): string | null {
  return iso ? dateTime.format(new Date(iso)) : null;
}

const clock = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** 입장 시각 등 — "13:05" */
export function formatClock(iso: string): string {
  return clock.format(new Date(iso));
}
