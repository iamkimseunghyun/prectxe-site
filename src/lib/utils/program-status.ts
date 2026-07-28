/**
 * Program의 표시용 상태(effective status) 계산.
 *
 * Program.status는 수동 저장 enum이라 기간이 끝나도 admin이 completed로
 * 갱신하지 않으면 upcoming으로 남는다. 공개 화면에서는 종료일(endAt, 없으면
 * startAt)이 지났으면 저장값과 무관하게 completed로 취급한다.
 */
export type ProgramDisplayStatus = 'upcoming' | 'completed';

export function getEffectiveProgramStatus(
  status: ProgramDisplayStatus,
  startAt: Date | string | null | undefined,
  endAt: Date | string | null | undefined,
  now: Date = new Date()
): ProgramDisplayStatus {
  if (status !== 'upcoming') return status;
  const ref = endAt ? new Date(endAt) : startAt ? new Date(startAt) : null;
  if (ref && ref.getTime() < now.getTime()) return 'completed';
  return status;
}
