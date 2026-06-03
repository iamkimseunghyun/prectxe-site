export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일`;
};

export const formatDateForInput = (
  isoString: string | null | undefined
): string => {
  if (!isoString) return formatDate(new Date());
  return isoString.split('T')[0];
};

export function formatDateForForm(
  dateString: string | Date | undefined
): string {
  try {
    if (!dateString) {
      return new Date().toISOString().split('T')[0];
    }
    const date =
      typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.error('날짜 변환 오류:', e);
    return new Date().toISOString().split('T')[0];
  }
}

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

export const formatEventDate = (startDate: Date, endDate: Date): string => {
  const formattedStart = formatDate(startDate);
  if (isSameDay(startDate, endDate)) {
    return formattedStart;
  }
  return `${formattedStart} - ${formatDate(endDate)}`;
};

const WEEKDAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * KST 기준 'YYYY년 M월 D일 (요일) 오전/오후 hh:mm' 결정적 포맷.
 * toLocaleString의 로케일 문자열은 서버(Node)·브라우저 ICU 버전 차이로 미묘하게
 * 달라져 hydration mismatch(React #418)를 유발한다. 그래서 +9h 시프트 후
 * UTC getter만 사용해 서버/클라이언트가 동일한 문자열을 만들도록 한다.
 * withYear=false면 연도를 생략.
 */
export const formatKstDateTime = (date: Date, withYear = true): string => {
  if (Number.isNaN(date.getTime())) return '';
  const kst = new Date(date.getTime() + 9 * 3600 * 1000);
  const y = kst.getUTCFullYear();
  const mo = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const wd = WEEKDAYS_KR[kst.getUTCDay()];
  const h24 = kst.getUTCHours();
  const ampm = h24 < 12 ? '오전' : '오후';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hh = String(h12).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  const datePart = withYear ? `${y}년 ${mo}월 ${d}일` : `${mo}월 ${d}일`;
  return `${datePart} (${wd}) ${ampm} ${hh}:${mm}`;
};

/** 시작~종료 KST 이벤트 범위 문자열. 종료가 없으면 시작만 반환. */
export const formatKstEventRange = (start: Date, end?: Date | null): string => {
  const s = formatKstDateTime(start, true);
  if (!s) return '';
  if (!end) return s;
  const e = formatKstDateTime(end, false);
  return e ? `${s} ~ ${e}` : s;
};

/**
 * datetime-local input value('YYYY-MM-DDTHH:mm')를 KST 벽시계 시간으로
 * 해석해 UTC Date로 변환. 서버 timezone(UTC)에서 new Date()가 잘못
 * 해석하는 문제 회피.
 */
export const parseKstDateInput = (value: string): Date =>
  new Date(`${value}:00+09:00`);

/**
 * UTC Date를 KST 벽시계 시간 'YYYY-MM-DDTHH:mm' 문자열로 변환
 * (datetime-local input의 defaultValue용).
 */
export const toKstDateInputValue = (date: Date): string => {
  const kst = new Date(date.getTime() + 9 * 3600 * 1000);
  return kst.toISOString().slice(0, 16);
};
