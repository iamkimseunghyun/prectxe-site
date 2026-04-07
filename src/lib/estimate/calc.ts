import type { LineItem } from '@/lib/schemas/estimate';

export const VAT_RATE = 0.1;

export interface EstimateTotals {
  /** 공급가액 합계 (부가세 별도) */
  subtotal: number;
  /** 부가세 (10%) */
  vat: number;
  /** 합계금액 (공급가액 + 부가세) */
  total: number;
}

export function computeLineAmount(item: LineItem): number {
  return Math.round(item.qty * item.unitPrice);
}

export function computeEstimateTotals(items: LineItem[]): EstimateTotals {
  const subtotal = items.reduce(
    (sum, item) => sum + computeLineAmount(item),
    0
  );
  const vat = Math.round(subtotal * VAT_RATE);
  return { subtotal, vat, total: subtotal + vat };
}

const KOREAN_DIGITS = [
  '',
  '일',
  '이',
  '삼',
  '사',
  '오',
  '육',
  '칠',
  '팔',
  '구',
];
const KOREAN_UNITS_SMALL = ['', '십', '백', '천'];
const KOREAN_UNITS_BIG = ['', '만', '억', '조', '경'];

/** 숫자를 한글 금액 표기로 변환. 예: 1234567 → 일백이십삼만사천오백육십칠 */
export function numberToKoreanAmount(n: number): string {
  if (!Number.isFinite(n)) return '';
  const num = Math.round(n);
  if (num === 0) return '영';

  const negative = num < 0;
  let value = Math.abs(num);
  const groups: number[] = [];
  while (value > 0) {
    groups.push(value % 10000);
    value = Math.floor(value / 10000);
  }

  let result = '';
  groups.forEach((group, idx) => {
    if (group === 0) return;
    let groupStr = '';
    let g = group;
    let pos = 0;
    while (g > 0) {
      const digit = g % 10;
      if (digit > 0) {
        groupStr = KOREAN_DIGITS[digit] + KOREAN_UNITS_SMALL[pos] + groupStr;
      }
      g = Math.floor(g / 10);
      pos++;
    }
    result = groupStr + KOREAN_UNITS_BIG[idx] + result;
  });

  return (negative ? '음 ' : '') + result;
}

export function formatKRW(n: number): string {
  if (!Number.isFinite(n)) return '-';
  return Math.round(n).toLocaleString('ko-KR');
}
