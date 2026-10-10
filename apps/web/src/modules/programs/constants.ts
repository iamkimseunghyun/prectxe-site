export const PROGRAM_TYPES = [
  'exhibition',
  'live',
  'party',
  'workshop',
  'talk',
] as const;

export type ProgramTypeValue = (typeof PROGRAM_TYPES)[number];

export const PROGRAM_TYPE_LABEL: Record<ProgramTypeValue, string> = {
  exhibition: '전시',
  live: '라이브',
  party: '파티',
  workshop: '워크숍',
  talk: '토크',
};

export function isProgramType(value: unknown): value is ProgramTypeValue {
  return (
    typeof value === 'string' &&
    (PROGRAM_TYPES as readonly string[]).includes(value)
  );
}

/** 행사 날짜는 KST 기준이라 연도도 KST로 센다(UTC로 세면 1/1 새벽 행사가 전년도로 간다). */
export function kstYear(date: Date | string): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
    }).format(new Date(date))
  );
}
