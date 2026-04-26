/**
 * 무통장 입금 관련 유틸 — 입금자명 매칭, 만료 시각, 계좌 정보
 * 환경변수: BANK_NAME, BANK_ACCOUNT_NUMBER, BANK_ACCOUNT_HOLDER, BANK_TRANSFER_EXPIRY_HOURS
 */

export function formatDepositorName(name: string, orderNo: string): string {
  // 이름 + 주문번호 끝 4자리 → 동명이인 입금 매칭용
  return `${name}${orderNo.slice(-4)}`;
}

export function getBankTransferExpiryHours(): number {
  const value = Number(process.env.BANK_TRANSFER_EXPIRY_HOURS ?? '24');
  return Number.isFinite(value) && value > 0 ? value : 24;
}

export function getBankTransferExpiryDate(from: Date = new Date()): Date {
  const hours = getBankTransferExpiryHours();
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function getBankInfo() {
  return {
    bankName: process.env.BANK_NAME ?? '',
    accountNumber: process.env.BANK_ACCOUNT_NUMBER ?? '',
    accountHolder: process.env.BANK_ACCOUNT_HOLDER ?? '',
  };
}
