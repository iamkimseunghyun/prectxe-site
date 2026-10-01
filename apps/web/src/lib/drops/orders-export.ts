import type { AOA } from '@/lib/export/spreadsheet';
import { toXlsx } from '@/lib/export/spreadsheet';
import { formatKstDateTime } from '@/lib/utils';

// AOA 빌더. CSV/XLSX 직렬화와 파일명 처리는 @/lib/export/spreadsheet 공용.
// 주문 목록은 단순 평면 테이블이라 빌더도 단순하다.

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

export async function toOrdersXlsx(aoa: AOA, sheetName: string) {
  return toXlsx(aoa, sheetName || '주문 목록', {
    columnWidths: [16, 22, 12, 16, 24, 30, 12, 10, 14, 14, 22],
    numberColumns: [AMOUNT_COL],
  });
}
