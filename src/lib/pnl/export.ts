import ExcelJS from 'exceljs';
import { computeBEP, computeRowAmount, computeTotals } from '@/lib/pnl/calc';
import type { PnLRow } from '@/lib/schemas/pnl';

type Cell = string | number;
type AOA = Cell[][];

type RowKind =
  | 'meta'
  | 'blank'
  | 'tableHeader1'
  | 'tableHeader2'
  | 'sectionHeader'
  | 'item'
  | 'subtotal'
  | 'summaryHeader'
  | 'summary';

interface SheetMeta {
  name: string;
  projectName: string | null;
  notes: string | null;
  scenarios: string[];
  rows: PnLRow[];
}

interface BuiltSheet {
  aoa: AOA;
  /** AOA와 동일 길이. 각 행의 의미를 표시 */
  rowKinds: RowKind[];
  /** 셀 병합 (0-based, end inclusive) */
  merges: Array<{
    s: { r: number; c: number };
    e: { r: number; c: number };
  }>;
  /** 시나리오별 서브컬럼 수 (수량/단가/금액 = 3) */
  subColsPerScenario: number;
  /** 데이터 테이블 시작 행 (0-based) — 표 첫 번째 헤더 행 */
  tableStartRow: number;
  /** 데이터 테이블 마지막 행 (0-based) — 마지막 요약 행 */
  tableEndRow: number;
  /** 시나리오 개수 (열 계산용) */
  scenarioCount: number;
}

const sectionLabel = { revenue: '수익', expense: '비용' } as const;
const costTypeLabel = { fixed: '고정비', variable: '변동비' } as const;

const SUB = 3; // 수량 / 단가 / 금액

/**
 * 시트 데이터를 표(AOA) + 행 종류 + 병합 정보로 직렬화한다.
 * 각 시나리오는 수량 / 단가 / 금액 3개 서브컬럼으로 펼쳐진다.
 * 금액 모드 행은 (1, amount, amount)으로 변환해 산출내역을 명시한다.
 */
export function buildSheetTable(sheet: SheetMeta): BuiltSheet {
  const { scenarios, rows } = sheet;
  const aoa: AOA = [];
  const rowKinds: RowKind[] = [];
  const merges: BuiltSheet['merges'] = [];

  const push = (row: Cell[], kind: RowKind) => {
    aoa.push(row);
    rowKinds.push(kind);
  };

  // ── 메타 헤더 ─────────────────────────────────────
  push(['시트', sheet.name], 'meta');
  if (sheet.projectName) push(['관련 프로그램', sheet.projectName], 'meta');
  if (sheet.notes) push(['메모', sheet.notes], 'meta');
  push([], 'blank');

  // ── 표 헤더 (2줄 + 병합) ─────────────────────────
  const tableStartRow = aoa.length;
  const totalCols = 2 + scenarios.length * SUB;

  const header1: Cell[] = ['항목', '분류'];
  for (const s of scenarios) header1.push(s, '', '');
  push(header1, 'tableHeader1');

  const header2: Cell[] = ['', ''];
  for (let i = 0; i < scenarios.length; i++) {
    header2.push('수량', '단가', '금액');
  }
  push(header2, 'tableHeader2');

  // 병합: 항목/분류는 세로 2줄, 시나리오 이름은 가로 3칸
  merges.push({
    s: { r: tableStartRow, c: 0 },
    e: { r: tableStartRow + 1, c: 0 },
  });
  merges.push({
    s: { r: tableStartRow, c: 1 },
    e: { r: tableStartRow + 1, c: 1 },
  });
  for (let i = 0; i < scenarios.length; i++) {
    const startCol = 2 + i * SUB;
    merges.push({
      s: { r: tableStartRow, c: startCol },
      e: { r: tableStartRow, c: startCol + SUB - 1 },
    });
  }

  // ── 섹션별 데이터 ───────────────────────────────
  for (const section of ['revenue', 'expense'] as const) {
    const sectionRowIdx = aoa.length;
    const sectionRow: Cell[] = new Array(totalCols).fill('');
    sectionRow[0] = sectionLabel[section];
    push(sectionRow, 'sectionHeader');
    merges.push({
      s: { r: sectionRowIdx, c: 0 },
      e: { r: sectionRowIdx, c: totalCols - 1 },
    });

    const sectionRows = rows.filter(
      (r) => r.section === section && r.type === 'item'
    );
    for (const row of sectionRows) {
      const classification =
        section === 'expense' && row.costType
          ? costTypeLabel[row.costType]
          : '-';
      const cells: Cell[] = [row.label || '(이름 없음)', classification];
      for (const s of scenarios) {
        const cell = row.values[s] ?? { qty: null, price: null, amount: null };
        const amount = computeRowAmount(row, s);
        if (row.inputMode === 'qty_price') {
          cells.push(Number(cell.qty ?? 0), Number(cell.price ?? 0), amount);
        } else {
          cells.push(1, amount, amount);
        }
      }
      push(cells, 'item');
    }

    const subtotalRowIdx = aoa.length;
    const subtotal: Cell[] = [`${sectionLabel[section]} 소계`, ''];
    for (const s of scenarios) {
      const totals = computeTotals(rows, s);
      const value = section === 'revenue' ? totals.revenue : totals.expense;
      subtotal.push('', '', value);
    }
    push(subtotal, 'subtotal');
    merges.push({
      s: { r: subtotalRowIdx, c: 0 },
      e: { r: subtotalRowIdx, c: 1 },
    });

    push([], 'blank');
  }

  // ── 요약 ────────────────────────────────────────
  const summaryHeaderIdx = aoa.length;
  const summaryHeader: Cell[] = ['요약', ''];
  for (const s of scenarios) summaryHeader.push(s, '', '');
  push(summaryHeader, 'summaryHeader');
  merges.push({
    s: { r: summaryHeaderIdx, c: 0 },
    e: { r: summaryHeaderIdx, c: 1 },
  });
  for (let i = 0; i < scenarios.length; i++) {
    const startCol = 2 + i * SUB;
    merges.push({
      s: { r: summaryHeaderIdx, c: startCol },
      e: { r: summaryHeaderIdx, c: startCol + SUB - 1 },
    });
  }

  const lineDefs: { label: string; pick: (s: string) => number | string }[] = [
    { label: '총수익', pick: (s) => computeTotals(rows, s).revenue },
    { label: '총비용', pick: (s) => computeTotals(rows, s).expense },
    { label: '순이익', pick: (s) => computeTotals(rows, s).net },
    { label: '고정비', pick: (s) => computeTotals(rows, s).fixedCost },
    { label: '변동비', pick: (s) => computeTotals(rows, s).variableCost },
    {
      label: 'BEP (매출액)',
      pick: (s) => {
        const bep = computeBEP(computeTotals(rows, s));
        return bep.computable && bep.bepRevenue !== undefined
          ? Math.round(bep.bepRevenue)
          : (bep.reason ?? '-');
      },
    },
    {
      label: '공헌이익률(%)',
      pick: (s) => {
        const bep = computeBEP(computeTotals(rows, s));
        return bep.computable && bep.contributionMarginRatio !== undefined
          ? Number((bep.contributionMarginRatio * 100).toFixed(2))
          : '-';
      },
    },
  ];
  for (const def of lineDefs) {
    const rowIdx = aoa.length;
    const cells: Cell[] = [def.label, ''];
    for (const s of scenarios) cells.push('', '', def.pick(s));
    push(cells, 'summary');
    merges.push({ s: { r: rowIdx, c: 0 }, e: { r: rowIdx, c: 1 } });
  }

  return {
    aoa,
    rowKinds,
    merges,
    subColsPerScenario: SUB,
    tableStartRow,
    tableEndRow: aoa.length - 1,
    scenarioCount: scenarios.length,
  };
}

// ───────── CSV ─────────

export function toCsv(built: BuiltSheet): string {
  const escapeCell = (cell: Cell): string => {
    const s = String(cell ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = built.aoa
    .map((row) => row.map(escapeCell).join(','))
    .join('\r\n');
  return `\uFEFF${body}`;
}

// ───────── XLSX (with styling) ─────────

// 색상 팔레트 (ARGB)
const COLOR = {
  headerBg: 'FF334155', // slate-700
  headerText: 'FFFFFFFF',
  subHeaderBg: 'FFE2E8F0', // slate-200
  sectionRevenueBg: 'FFDCFCE7', // green-100
  sectionExpenseBg: 'FFFEE2E2', // red-100
  subtotalBg: 'FFF1F5F9', // slate-100
  summaryHeaderBg: 'FFDBEAFE', // blue-100
  summaryBg: 'FFEFF6FF', // blue-50
  border: 'FFCBD5E1', // slate-300
  netPositive: 'FF065F46', // emerald-800
  netNegative: 'FFB91C1C', // red-700
} as const;

const NUM_FMT = '#,##0';
const PERCENT_FMT = '0.00';

function applyBorder(cell: ExcelJS.Cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: COLOR.border } },
    left: { style: 'thin', color: { argb: COLOR.border } },
    right: { style: 'thin', color: { argb: COLOR.border } },
    bottom: { style: 'thin', color: { argb: COLOR.border } },
  };
}

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb },
  };
}

export async function toXlsx(
  built: BuiltSheet,
  sheetName: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PRECTXE';
  wb.created = new Date();

  const safeName =
    sheetName.replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || 'Sheet1';
  const ws = wb.addWorksheet(safeName, {
    views: [{ state: 'frozen', ySplit: built.tableStartRow + 2 }],
  });

  // Add rows
  for (const row of built.aoa) {
    ws.addRow(row);
  }

  // Merges (exceljs uses 1-based, end inclusive)
  for (const m of built.merges) {
    ws.mergeCells(m.s.r + 1, m.s.c + 1, m.e.r + 1, m.e.c + 1);
  }

  // Column widths
  const totalCols = 2 + built.scenarioCount * built.subColsPerScenario;
  for (let i = 0; i < totalCols; i++) {
    const col = ws.getColumn(i + 1);
    if (i === 0) col.width = 28;
    else if (i === 1) col.width = 10;
    else {
      const sub = (i - 2) % built.subColsPerScenario;
      col.width = sub === 0 ? 9 : sub === 1 ? 13 : 15;
    }
  }

  // Style each row by kind
  built.rowKinds.forEach((kind, rIdx) => {
    const excelRow = ws.getRow(rIdx + 1);

    if (kind === 'meta') {
      const labelCell = excelRow.getCell(1);
      labelCell.font = { bold: true, color: { argb: 'FF475569' } };
      labelCell.alignment = { vertical: 'middle' };
      const valueCell = excelRow.getCell(2);
      valueCell.alignment = { vertical: 'middle', wrapText: true };
      return;
    }

    if (kind === 'blank') return;

    if (kind === 'tableHeader1' || kind === 'tableHeader2') {
      excelRow.height = kind === 'tableHeader1' ? 22 : 20;
      for (let c = 1; c <= totalCols; c++) {
        const cell = excelRow.getCell(c);
        cell.font = {
          bold: true,
          color: { argb: COLOR.headerText },
          size: 11,
        };
        fill(cell, COLOR.headerBg);
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
        };
        applyBorder(cell);
      }
      return;
    }

    if (kind === 'sectionHeader') {
      excelRow.height = 22;
      const isRevenue = excelRow.getCell(1).value === sectionLabel.revenue;
      const bg = isRevenue ? COLOR.sectionRevenueBg : COLOR.sectionExpenseBg;
      for (let c = 1; c <= totalCols; c++) {
        const cell = excelRow.getCell(c);
        cell.font = { bold: true, size: 12, color: { argb: 'FF1E293B' } };
        fill(cell, bg);
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
        applyBorder(cell);
      }
      return;
    }

    if (kind === 'item') {
      for (let c = 1; c <= totalCols; c++) {
        const cell = excelRow.getCell(c);
        applyBorder(cell);
        if (c === 1) {
          cell.alignment = { vertical: 'middle' };
        } else if (c === 2) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.font = { size: 10, color: { argb: 'FF64748B' } };
        } else {
          // numeric cells (수량/단가/금액)
          cell.numFmt = NUM_FMT;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          // 금액 컬럼(트리오 마지막)은 약간 강조
          const sub = (c - 3) % built.subColsPerScenario;
          if (sub === 2) {
            cell.font = { bold: true };
          }
        }
      }
      return;
    }

    if (kind === 'subtotal') {
      excelRow.height = 22;
      for (let c = 1; c <= totalCols; c++) {
        const cell = excelRow.getCell(c);
        fill(cell, COLOR.subtotalBg);
        cell.font = { bold: true };
        applyBorder(cell);
        if (c >= 3) {
          cell.numFmt = NUM_FMT;
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      }
      return;
    }

    if (kind === 'summaryHeader') {
      excelRow.height = 22;
      for (let c = 1; c <= totalCols; c++) {
        const cell = excelRow.getCell(c);
        cell.font = { bold: true, size: 11, color: { argb: 'FF1E40AF' } };
        fill(cell, COLOR.summaryHeaderBg);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        applyBorder(cell);
      }
      return;
    }

    if (kind === 'summary') {
      const label = String(excelRow.getCell(1).value ?? '');
      const isPercent = label.includes('%');
      const isNet = label === '순이익';
      for (let c = 1; c <= totalCols; c++) {
        const cell = excelRow.getCell(c);
        fill(cell, COLOR.summaryBg);
        applyBorder(cell);
        if (c <= 2) {
          cell.font = { bold: true };
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          if (typeof cell.value === 'number') {
            cell.numFmt = isPercent ? PERCENT_FMT : NUM_FMT;
          }
          if (isNet && typeof cell.value === 'number') {
            cell.font = {
              bold: true,
              color: {
                argb: cell.value >= 0 ? COLOR.netPositive : COLOR.netNegative,
              },
            };
          } else {
            cell.font = { bold: true };
          }
        }
      }
      return;
    }
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

export function safeFilename(base: string, ext: 'csv' | 'xlsx'): string {
  const cleaned = base
    .replace(/[\\/?*"<>|:]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
  const stamp = new Date().toISOString().slice(0, 10);
  return `${cleaned || 'pnl-sheet'}_${stamp}.${ext}`;
}
