const WEEKDAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

/** UTC Date를 KST 벽시계로 시프트. 이후 getUTC*로 읽으면 KST 값이 된다. */
const toKst = (date: Date): Date => new Date(date.getTime() + 9 * 3600 * 1000);

/**
 * KST 기준 'YYYY년 M월 D일' (withYear=false면 'M월 D일').
 * toLocale* 로케일 문자열은 서버(Node)·브라우저 ICU 버전 차로 미묘하게 달라져
 * hydration mismatch(React #418)를 유발하므로, +9h 시프트 후 UTC getter만 써서
 * 서버/클라이언트가 동일한 문자열을 만들도록 한다.
 */
export const formatKstDate = (date: Date, withYear = true): string => {
  if (Number.isNaN(date.getTime())) return '';
  const kst = toKst(date);
  const y = kst.getUTCFullYear();
  const mo = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  return withYear ? `${y}년 ${mo}월 ${d}일` : `${mo}월 ${d}일`;
};

/** KST 기준 'YYYY년 M월 D일 (요일) 오전/오후 hh:mm'. */
export const formatKstDateTime = (date: Date, withYear = true): string => {
  if (Number.isNaN(date.getTime())) return '';
  const kst = toKst(date);
  const wd = WEEKDAYS_KR[kst.getUTCDay()];
  const h24 = kst.getUTCHours();
  const ampm = h24 < 12 ? '오전' : '오후';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hh = String(h12);
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${formatKstDate(date, withYear)} (${wd}) ${ampm} ${hh}:${mm}`;
};

/** KST 기준 두 날짜가 같은 날인지. */
export const isSameDay = (a: Date, b: Date): boolean => {
  const ka = toKst(a);
  const kb = toKst(b);
  return (
    ka.getUTCFullYear() === kb.getUTCFullYear() &&
    ka.getUTCMonth() === kb.getUTCMonth() &&
    ka.getUTCDate() === kb.getUTCDate()
  );
};

/** KST 날짜 범위(시간 없음). 종료가 없거나 같은 날이면 시작만. */
export const formatKstDateRange = (start: Date, end?: Date | null): string => {
  const s = formatKstDate(start, true);
  if (!s) return '';
  if (!end || isSameDay(start, end)) return s;
  const e = formatKstDate(end, false);
  return e ? `${s} ~ ${e}` : s;
};

/** KST 이벤트 범위(시간 포함). 종료가 없으면 시작만. */
export const formatKstEventRange = (start: Date, end?: Date | null): string => {
  const s = formatKstDateTime(start, true);
  if (!s) return '';
  if (!end) return s;
  const e = formatKstDateTime(end, false);
  return e ? `${s} ~ ${e}` : s;
};

/** ISO 문자열을 'YYYY-MM-DD'로 (날짜 input value용). */
export const formatDateForInput = (
  isoString: string | null | undefined
): string => {
  if (!isoString) return toKst(new Date()).toISOString().split('T')[0];
  return isoString.split('T')[0];
};

export function formatDateForForm(
  dateString: string | Date | undefined
): string {
  try {
    if (!dateString) {
      return toKst(new Date()).toISOString().split('T')[0];
    }
    const date =
      typeof dateString === 'string' ? new Date(dateString) : dateString;
    return toKst(date).toISOString().split('T')[0];
  } catch (e) {
    console.error('날짜 변환 오류:', e);
    return toKst(new Date()).toISOString().split('T')[0];
  }
}

/**
 * date/datetime-local input value를 KST 벽시계 시간으로 해석해 UTC Date로 변환.
 * 서버 timezone(UTC)에서 new Date()가 잘못 해석하는 문제 회피.
 * - 'YYYY-MM-DDTHH:mm' (datetime-local) → 해당 KST 시각
 * - 'YYYY-MM-DD' (date) → 그 날 KST 자정
 */
export const parseKstDateInput = (value: string): Date => {
  const normalized = value.includes('T') ? value : `${value}T00:00`;
  // 이미 초(HH:mm:ss)가 있으면 :00을 또 붙이지 않는다.
  const hasSeconds = normalized.split('T')[1]?.split(':').length > 2;
  return new Date(`${normalized}${hasSeconds ? '' : ':00'}+09:00`);
};

/**
 * UTC Date를 KST 벽시계 시간 'YYYY-MM-DDTHH:mm' 문자열로 변환
 * (datetime-local input의 defaultValue용).
 */
export const toKstDateInputValue = (date: Date): string => {
  const kst = new Date(date.getTime() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 16);
};
