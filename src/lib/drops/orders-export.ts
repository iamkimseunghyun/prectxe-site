import ExcelJS from 'exceljs';
import { formatKstDateTime } from '@/lib/utils';

// PnL 내보내기(`@/lib/pnl/export`)와 동일한 패턴 — AOA 직렬화 + toCsv/toXlsx +
// safeFilename. 주문 목록은 단순 평면 테이블이라 빌더도 단순하다.

type Cell = string | number;
type AOA = Cell[][];

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: '대기',
  paid: '결제완료',
  confirmed: '확정',
  cancelled: '취소',
  refunded: '환불',
};

export interface ExportOrder {
  orderNo: string;
  createdAt: Date;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  totalAmount: number;
  status: string;
  items: {
    quantity: number;
    ticketTier: { name: string } | null;
    goodsVariant: { name: string } | null;
  }[];
  payment: { method: string | null; paidAt: Date | null } | null;
  bankTransfer: {
    depositorName: string;
    status: string;
    confirmedAt: Date | null;
  } | null;
}

const HEADERS = [
  '주문번호',
  '주문일시',
  '구매자',
  '연락처',
  '이메일',
  '상품',
  '금액',
  '상태',
  '결제수단',
  '입금자명',
  '확인일시',
];
/** 금액 컬럼 (0-based) — xlsx 숫자 서식용 */
const AMOUNT_COL = 6;

export function buildOrdersAoa(orders: ExportOrder[]): AOA {
  const aoa: AOA = [HEADERS];
  for (const o of orders) {
    const items = o.items
      .map(
        (i) =>
          `${i.ticketTier?.name ?? i.goodsVariant?.name ?? '?'} ×${i.quantity}`
      )
      .join(', ');
    const method = o.payment?.method ?? (o.bankTransfer ? '무통장입금' : '');
    const confirmedAt =
      o.payment?.paidAt ?? o.bankTransfer?.confirmedAt ?? null;
    aoa.push([
      o.orderNo,
      formatKstDateTime(o.createdAt),
      o.buyerName,
      o.buyerPhone,
      o.buyerEmail,
      items,
      o.totalAmount,
      ORDER_STATUS_LABEL[o.status] ?? o.status,
      method,
      o.bankTransfer?.depositorName ?? '',
      confirmedAt ? formatKstDateTime(confirmedAt) : '',
    ]);
  }
  return aoa;
}

// ───────── CSV ─────────

export function toCsv(aoa: AOA): string {
  const escapeCell = (cell: Cell): string => {
    if (typeof cell === 'number') return String(cell);
    let s = String(cell ?? '');
    // CSV 수식 인젝션 방어 — 수식 시작 문자로 시작하는 사용자 입력은 ' 프리픽스
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = aoa.map((row) => row.map(escapeCell).join(',')).join('\r\n');
  // BOM(\ufeff) — Excel에서 한글 깨짐 방지
  return `\ufeff${body}`;
}

// ───────── XLSX ─────────

export async function toXlsx(aoa: AOA, sheetName: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PRECTXE';
  wb.created = new Date();

  const safeName =
    sheetName.replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || '주문 목록';
  const ws = wb.addWorksheet(safeName, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  for (const row of aoa) ws.addRow(row);

  // 헤더 스타일
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

  // 컬럼 너비
  const widths = [16, 22, 12, 16, 24, 30, 12, 10, 14, 14, 22];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  // 금액 컬럼 숫자 서식
  for (let r = 2; r <= aoa.length; r++) {
    const cell = ws.getRow(r).getCell(AMOUNT_COL + 1);
    cell.numFmt = '#,##0';
    cell.alignment = { horizontal: 'right' };
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

/** KST 기준 'YYYY-MM-DD' (UTC toISOString은 오전 9시 전 전날로 밀림) */
function kstDateStamp(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 표시용 파일명(한글 포함). Content-Disposition의 filename* 에 사용 */
export function safeFilename(base: string, ext: 'csv' | 'xlsx'): string {
  const cleaned = base
    .replace(/[\\/?*"<>|:]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 80);
  return `${cleaned || 'orders'}_${kstDateStamp()}.${ext}`;
}

/** 비ASCII 미지원 환경용 폴백 파일명. Content-Disposition의 filename= 에 사용 */
export function asciiFilename(ext: 'csv' | 'xlsx'): string {
  return `drop-orders_${kstDateStamp()}.${ext}`;
}
