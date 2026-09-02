import type { AOA } from '@/lib/export/spreadsheet';
import { formatKstDateTime } from '@/lib/utils';

/**
 * 제출 목록을 표로 펴는 순수 로직.
 *
 * 화면(submissions-view)과 내보내기 라우트가 **같은 규칙**을 써야 해서
 * 컴포넌트 밖에 둔다. 예전에는 뷰 안에만 있어서, 내보내기를 서버로 옮기려면
 * 컬럼 그룹핑을 복제해야 했다.
 */

export interface TableField {
  id: string;
  label: string;
  type: string;
  order: number;
  archived: boolean;
}

export interface TableResponse {
  fieldId: string | null;
  fieldLabel: string | null;
  value: string;
  field: { id: string; label: string; archived: boolean } | null;
}

export interface TableSubmission {
  id: string;
  submittedAt: Date;
  responses: TableResponse[];
}

export interface Column {
  /** row 객체의 키. 라벨이 'id'·'제출시간' 같은 예약 키와 부딪히지 않게 네임스페이스 */
  key: string;
  label: string;
  fieldIds: Set<string>;
  /** fieldId가 없는 레거시 응답을 라벨로 매칭할지 */
  matchLegacyLabel: boolean;
  /** 살아있는 필드가 있으면 삭제된 컬럼이 아니다 */
  hasActive: boolean;
  hasData: boolean;
  order: number;
}

/**
 * 라벨로 컬럼을 묶는다.
 *
 * 과거 편집 버그로 저장할 때마다 필드가 archive되고 새로 생성돼서, 하나의
 * 논리적 질문("이름")이 여러 fieldId로 갈라져 있다. 라벨이 같은 모든 세대를
 * 한 컬럼으로 합쳐야 어느 세대에 답했든 같은 자리에 들어간다.
 */
export function buildColumns(
  fields: TableField[],
  submissions: TableSubmission[]
): Column[] {
  const map = new Map<string, Column>();
  const getCol = (label: string) => {
    let col = map.get(label);
    if (!col) {
      col = {
        key: `field:${label}`,
        label,
        fieldIds: new Set(),
        matchLegacyLabel: false,
        hasActive: false,
        hasData: false,
        order: Number.MAX_SAFE_INTEGER,
      };
      map.set(label, col);
    }
    return col;
  };

  for (const field of fields) {
    const col = getCol(field.label);
    col.fieldIds.add(field.id);
    if (!field.archived) {
      col.hasActive = true;
      col.order = Math.min(col.order, field.order);
    }
  }

  // 폼에 더 이상 없는 필드/라벨을 가리키는 응답(레거시 데이터)
  for (const submission of submissions) {
    for (const response of submission.responses) {
      if (response.field) {
        const col = getCol(response.field.label);
        col.fieldIds.add(response.field.id);
        if (!response.field.archived) col.hasActive = true;
        if (response.value?.trim()) col.hasData = true;
      } else if (!response.fieldId && response.fieldLabel) {
        const col = getCol(response.fieldLabel);
        col.matchLegacyLabel = true;
        if (response.value?.trim()) col.hasData = true;
      }
    }
  }

  // 살아있는 컬럼과, 삭제됐지만 데이터가 남은 컬럼만 남긴다.
  return Array.from(map.values())
    .filter((col) => col.hasActive || col.hasData)
    .sort((a, b) =>
      a.order !== b.order ? a.order - b.order : a.label.localeCompare(b.label)
    );
}

/**
 * checkbox/multiselect 응답은 JSON 배열 문자열로 저장된다(`["a","b"]`).
 * 표·상세·내보내기에 그대로 노출되면 어드민이 원문 JSON을 읽게 되므로 편다.
 * 배열로 파싱되지 않으면(대괄호로 시작하는 평범한 답변 등) 원문을 그대로 둔다.
 */
export function formatResponseValue(value: string): string {
  if (!value.startsWith('[')) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.join(', ') : value;
  } catch {
    return value;
  }
}

/** 한 제출에서 해당 컬럼의 값을 고른다. */
function pickValue(submission: TableSubmission, col: Column): string {
  const matches = submission.responses.filter(
    (r) =>
      (r.fieldId != null && col.fieldIds.has(r.fieldId)) ||
      (r.fieldId == null && col.matchLegacyLabel && r.fieldLabel === col.label)
  );
  // 한 제출에 여러 개가 걸리면 값이 있는 쪽을 우선한다.
  const chosen = matches.find((r) => r.value?.trim()) ?? matches[0];
  // 빈 배열('[]')은 펴면 빈 문자열이 되므로 미응답과 같게 '-'로 둔다.
  return formatResponseValue(chosen?.value ?? '') || '-';
}

/** 화면 표용 행. 키는 네임스페이스된 컬럼 키 + 예약 키(id·제출시간). */
export function buildRows(
  submissions: TableSubmission[],
  columns: Column[]
): Record<string, string>[] {
  return submissions.map((submission) => {
    const row: Record<string, string> = {
      id: submission.id,
      제출시간: formatKstDateTime(new Date(submission.submittedAt)),
    };
    for (const col of columns) row[col.key] = pickValue(submission, col);
    return row;
  });
}

/** 내보내기용 AOA. 첫 줄이 헤더(사람이 읽는 라벨). */
export function buildSubmissionsAoa(
  fields: TableField[],
  submissions: TableSubmission[]
): AOA {
  const columns = buildColumns(fields, submissions);
  const header = ['제출시간', ...columns.map((c) => c.label)];
  const rows = submissions.map((submission) => [
    formatKstDateTime(new Date(submission.submittedAt)),
    ...columns.map((col) => pickValue(submission, col)),
  ]);
  return [header, ...rows];
}
