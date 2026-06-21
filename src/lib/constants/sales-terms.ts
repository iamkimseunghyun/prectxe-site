import type { Locale } from '@/i18n/config';

/**
 * 통신판매업 신고 완료 전 일시 단어 매핑.
 * 신고 번호 발급 후 SALES_LICENSED를 true로 바꾸면 사용자 노출 문구가
 * '주문/구매' 표준 용어로 한 번에 복구됨. (KO·EN 양쪽 동시 복구)
 * 어드민 UI는 대상 아님 — 정확한 표현(주문 목록 등) 유지.
 */
const SALES_LICENSED = false;

/**
 * 로케일 + 라이선스 상태에 따라 노출 용어 세트를 반환.
 * 호출부: 클라이언트는 useLocale(), 서버/이메일은 getLocale() 또는 명시 전달.
 */
export function getSalesTerms(locale: Locale = 'ko') {
  const en = locale === 'en';
  // (koLicensed, koUnlicensed, enLicensed, enUnlicensed) 중 현재 상태 선택
  const t = (koL: string, koU: string, enL: string, enU: string) =>
    en ? (SALES_LICENSED ? enL : enU) : SALES_LICENSED ? koL : koU;

  return {
    // ── atom ──
    order: t('주문', '예약', 'order', 'reservation'),
    orderNumber: t('주문번호', '예약번호', 'Order No.', 'Reservation No.'),
    orderItems: t(
      '주문 내역',
      '예약 내역',
      'Order Summary',
      'Reservation Summary'
    ),

    // ── CTA ──
    ctaPaid: t('주문하기', '예약하기', 'Order', 'Reserve'),
    ctaPaidWithPrice: (amount: number) =>
      en
        ? `${SALES_LICENSED ? 'Order' : 'Reserve'} · ₩${amount.toLocaleString()}`
        : `${amount.toLocaleString()}원 ${SALES_LICENSED ? '주문하기' : '예약하기'}`,
    ctaPurchase: t('구매하기', '예약하기', 'Buy', 'Reserve'),

    // ── 폼 라벨 ──
    ordererInfo: t(
      '주문자 정보',
      '예약자 정보',
      'Order Details',
      'Reservation Details'
    ),
    purchaserInfo: t(
      '구매자 정보',
      '예약자 정보',
      'Buyer Details',
      'Reservation Details'
    ),

    // ── 안내 sentence ──
    receiptHeading: t(
      '주문 접수 완료',
      '예약 접수 완료',
      'Order Received',
      'Reservation Received'
    ),
    proceedSentence: t(
      '주문을 진행합니다.',
      '예약을 진행합니다.',
      'I proceed with the order.',
      'I proceed with the reservation.'
    ),

    receivedNotice: (name: string) =>
      en
        ? `Hello ${name}, your ${SALES_LICENSED ? 'order' : 'reservation'} has been received.`
        : `안녕하세요 ${name}님, ${SALES_LICENSED ? '주문' : '예약'}이 접수되었습니다.`,
    completedNotice: (name: string) =>
      en
        ? `Hello ${name}, your ${SALES_LICENSED ? 'order' : 'reservation'} is complete.`
        : `안녕하세요 ${name}님, ${SALES_LICENSED ? '주문' : '예약'}이 완료되었습니다.`,
    confirmedAfterDeposit: t(
      '입금 확인 후 주문이 확정되며 이메일로 안내드립니다.',
      '입금 확인 후 예약이 확정되며 이메일로 안내드립니다.',
      'Your order is confirmed once payment is verified, and we will notify you by email.',
      'Your reservation is confirmed once payment is verified, and we will notify you by email.'
    ),
    autoCancelNotice: t(
      '마감 시각까지 미입금 시 주문은 자동 취소되며 좌석이 다른 고객에게 풀립니다.',
      '마감 시각까지 미입금 시 예약은 자동 취소되며 좌석이 다른 고객에게 풀립니다.',
      'If payment is not received by the deadline, your order is auto-cancelled and the seats are released to other customers.',
      'If payment is not received by the deadline, your reservation is auto-cancelled and the seats are released to other customers.'
    ),
    depositorTip: t(
      '동명이인 매칭을 위해 위 형태(이름+주문번호 끝 4자리) 그대로 입금해 주세요.',
      '동명이인 매칭을 위해 위 형태(이름+예약번호 끝 4자리) 그대로 입금해 주세요.',
      'To distinguish identical names, please transfer using the exact format above (name + last 4 digits of the order no.).',
      'To distinguish identical names, please transfer using the exact format above (name + last 4 digits of the reservation no.).'
    ),
    orderNumberSuffixTip: t(
      '주문번호 끝 4자리가 자동으로 추가됩니다 (예: 홍길동A1B2)',
      '예약번호 끝 4자리가 자동으로 추가됩니다 (예: 홍길동A1B2)',
      'The last 4 digits of your order no. are added automatically (e.g. JohnDoeA1B2).',
      'The last 4 digits of your reservation no. are added automatically (e.g. JohnDoeA1B2).'
    ),

    // ── 굿즈 ──
    purchaseCompletedHeading: t(
      '구매가 완료되었습니다',
      '예약이 완료되었습니다',
      'Purchase complete',
      'Reservation complete'
    ),
    // "결제 방식: 무통장 입금 · {여기}로" 패턴에서 가운데만
    afterOrderTo: t(
      '주문 후 안내된 계좌로',
      '예약 후 안내된 계좌로',
      'to the account provided after ordering,',
      'to the account provided after reserving,'
    ),

    // ── 에러 메시지 (toast/server) ──
    errorMaxPerOrder: (name: string, max: number) =>
      en
        ? `${name} can be ${SALES_LICENSED ? 'purchased' : 'reserved'} up to ${max} per order.`
        : `${name}은(는) 최대 ${max}장까지 ${SALES_LICENSED ? '구매' : '예약'} 가능합니다.`,
    errorOrderNotFound: t(
      '주문을 찾을 수 없습니다.',
      '예약을 찾을 수 없습니다.',
      'Order not found.',
      'Reservation not found.'
    ),
    errorAlreadyProcessed: t(
      '이미 처리된 주문입니다.',
      '이미 처리된 예약입니다.',
      'This order has already been processed.',
      'This reservation has already been processed.'
    ),
    errorAlreadyCanceled: t(
      '이미 취소된 주문입니다.',
      '이미 취소된 예약입니다.',
      'This order has already been cancelled.',
      'This reservation has already been cancelled.'
    ),
    errorNotBankTransfer: t(
      '무통장 주문이 아닙니다.',
      '무통장 예약이 아닙니다.',
      'This is not a bank-transfer order.',
      'This is not a bank-transfer reservation.'
    ),
    errorCreateFailed: t(
      '주문 생성에 실패했습니다.',
      '예약 생성에 실패했습니다.',
      'Failed to create the order.',
      'Failed to create the reservation.'
    ),
    errorProcessing: t(
      '주문 처리 중 오류가 발생했습니다.',
      '예약 처리 중 오류가 발생했습니다.',
      'An error occurred while processing your order.',
      'An error occurred while processing your reservation.'
    ),

    // ── 메일 ──
    emailSubject: (dropTitle: string) =>
      en
        ? `[PRECTXE] ${SALES_LICENSED ? 'Order' : 'Reservation'} Confirmation — ${dropTitle}`
        : `[PRECTXE] ${SALES_LICENSED ? '주문 확인' : '예약 확인'} — ${dropTitle}`,
    emailPreview: (dropTitle: string) =>
      en
        ? `${SALES_LICENSED ? 'Order' : 'Reservation'} confirmation: ${dropTitle}`
        : `${SALES_LICENSED ? '주문 확인' : '예약 확인'}: ${dropTitle}`,
  } as const;
}

/** KO 기본 세트 — 미국제화 호출부(법률 페이지 등) 하위호환용. */
export const SALES_TERMS = getSalesTerms('ko');
