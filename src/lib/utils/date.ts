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
