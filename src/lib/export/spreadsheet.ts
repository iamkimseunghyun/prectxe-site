import ExcelJS from 'exceljs';

/**
 * AOA(Array of Arrays) 기반 표 내보내기 공용 헬퍼.
 *
 * 도메인별 export 모듈(주문·폼 응답 등)이 데이터를 AOA로 만들어 넘기면
 * 여기서 CSV/XLSX 직렬화와 파일명 처리를 담당한다.
 */

export type Cell = string | number;
export type AOA = Cell[][];

// ───────── CSV ─────────

export function toCsv(aoa: AOA): string {
  const escapeCell = (cell: Cell): string => {
    if (typeof cell === 'number') return String(cell);
    let s = String(cell ?? '');
    // CSV 수식 인젝션 방어 — 수식 시작 문자로 시작하는 사용자 입력은 ' 프리픽스.
    // 폼 응답처럼 외부인이 값을 채우는 표에서는 이게 필수다.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = aoa.map((row) => row.map(escapeCell).join(',')).join('\r\n');
  // BOM(﻿) — Excel에서 한글 깨짐 방지
  return `﻿${body}`;
}

// ───────── XLSX ─────────

interface XlsxOptions {
  /** 컬럼별 너비. 부족하면 나머지는 기본 너비 */
  columnWidths?: number[];
  /** 천단위 구분 + 우측 정렬을 적용할 컬럼 인덱스(0-based) */
  numberColumns?: number[];
}

export async function toXlsx(
  aoa: AOA,
  sheetName: string,
  options: XlsxOptions = {}
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PRECTXE';
  wb.created = new Date();

  // 시트명은 31자 제한 + 일부 문자 금지
  const safeName = sheetName.replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || '표';
  const ws = wb.addWorksheet(safeName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  for (const row of aoa) ws.addRow(row);

  const header = ws.getRow(1);
  header.height = 22;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  options.columnWidths?.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  for (const col of options.numberColumns ?? []) {
    for (let r = 2; r <= aoa.length; r++) {
      const cell = ws.getRow(r).getCell(col + 1);
      cell.numFmt = '#,##0';
      cell.alignment = { horizontal: 'right' };
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

// ───────── 파일명 ─────────

/** KST 기준 'YYYY-MM-DD' (UTC toISOString은 오전 9시 전 전날로 밀림) */
export function kstDateStamp(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 표시용 파일명(한글 포함). Content-Disposition의 filename* 에 사용 */
export function safeFilename(
  base: string,
  ext: 'csv' | 'xlsx',
  fallback = 'export'
): string {
  const cleaned = base
    .replace(/[\\/?*"<>|:]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
  return `${cleaned || fallback}_${kstDateStamp()}.${ext}`;
}

/**
 * 비ASCII 미지원 환경용 폴백 파일명. Content-Disposition의 filename= 에 사용.
 *
 * 한글 파일명을 filename=에 직접 넣으면 Vercel 런타임(undici)에서 헤더 인코딩
 * 오류로 함수가 크래시한다. filename=에는 이 ASCII 이름을, filename*=에는
 * UTF-8 퍼센트 인코딩한 실제 이름을 준다.
 */
export function asciiFilename(prefix: string, ext: 'csv' | 'xlsx'): string {
  return `${prefix}_${kstDateStamp()}.${ext}`;
}

/** Content-Disposition 한 줄. 한글 파일명을 안전하게 싣는다. */
export function contentDisposition(
  displayName: string,
  asciiName: string
): string {
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(displayName)}`;
}
