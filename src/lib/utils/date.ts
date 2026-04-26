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
