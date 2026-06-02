/**
 * 통신판매업 신고 완료 전 일시 단어 매핑.
 * 신고 번호 발급 후 SALES_LICENSED를 true로 바꾸면 사용자 노출 문구가
 * '주문/구매' 표준 용어로 한 번에 복구됨.
 * 어드민 UI는 대상 아님 — 정확한 표현(주문 목록 등) 유지.
 */
const SALES_LICENSED = false;

const t = (licensed: string, unlicensed: string) =>
  SALES_LICENSED ? licensed : unlicensed;

export const SALES_TERMS = {
  // ── atom ──
  order: t('주문', '예약'),
  orderNumber: t('주문번호', '예약번호'),
  orderItems: t('주문 내역', '예약 내역'),

  // ── CTA ──
  ctaPaid: t('주문하기', '예약하기'),
  ctaPaidWithPrice: (amount: number) =>
    `${amount.toLocaleString()}원 ${t('주문하기', '예약하기')}`,
  ctaPurchase: t('구매하기', '예약하기'),

  // ── 폼 라벨 ──
  ordererInfo: t('주문자 정보', '예약자 정보'),
  purchaserInfo: t('구매자 정보', '예약자 정보'),

  // ── 안내 sentence ──
  receiptHeading: t('주문 접수 완료', '예약 접수 완료'),
  proceedSentence: t('주문을 진행합니다.', '예약을 진행합니다.'),
  contractAgreeSentence: (cta: string) =>
    `에 동의하며, 위 ${t('주문', '예약')} 내용을 확인하고 ${cta}`,

  receivedNotice: (name: string) =>
    `안녕하세요 ${name}님, ${t('주문', '예약')}이 접수되었습니다.`,
  completedNotice: (name: string) =>
    `안녕하세요 ${name}님, ${t('주문', '예약')}이 완료되었습니다.`,
  confirmedAfterDeposit: t(
    '입금 확인 후 주문이 확정되며 이메일로 안내드립니다.',
    '입금 확인 후 예약이 확정되며 이메일로 안내드립니다.'
  ),
  autoCancelNotice: t(
    '마감 시각까지 미입금 시 주문은 자동 취소되며 좌석이 다른 고객에게 풀립니다.',
    '마감 시각까지 미입금 시 예약은 자동 취소되며 좌석이 다른 고객에게 풀립니다.'
  ),
  depositorTip: t(
    '동명이인 매칭을 위해 위 형태(이름+주문번호 끝 4자리) 그대로 입금해 주세요.',
    '동명이인 매칭을 위해 위 형태(이름+예약번호 끝 4자리) 그대로 입금해 주세요.'
  ),
  orderNumberSuffixTip: t(
    '주문번호 끝 4자리가 자동으로 추가됩니다 (예: 홍길동A1B2)',
    '예약번호 끝 4자리가 자동으로 추가됩니다 (예: 홍길동A1B2)'
  ),

  // ── 굿즈 ──
  purchaseCompletedHeading: t('구매가 완료되었습니다', '예약이 완료되었습니다'),
  scrollToBuyTip: t('↑ 위에서 구매', '↑ 위에서 예약'),
  // "결제 방식: 무통장 입금 · {여기}로" 패턴에서 가운데만
  afterOrderTo: t('주문 후 안내된 계좌로', '예약 후 안내된 계좌로'),

  // ── 에러 메시지 (toast/server) ──
  errorMaxPerOrder: (name: string, max: number) =>
    `${name}은(는) 최대 ${max}장까지 ${t('구매', '예약')} 가능합니다.`,
  errorOrderNotFound: t('주문을 찾을 수 없습니다.', '예약을 찾을 수 없습니다.'),
  errorAlreadyProcessed: t(
    '이미 처리된 주문입니다.',
    '이미 처리된 예약입니다.'
  ),
  errorAlreadyCanceled: t('이미 취소된 주문입니다.', '이미 취소된 예약입니다.'),
  errorNotBankTransfer: t('무통장 주문이 아닙니다.', '무통장 예약이 아닙니다.'),
  errorCreateFailed: t(
    '주문 생성에 실패했습니다.',
    '예약 생성에 실패했습니다.'
  ),
  errorProcessing: t(
    '주문 처리 중 오류가 발생했습니다.',
    '예약 처리 중 오류가 발생했습니다.'
  ),

  // ── 메일 ──
  emailSubject: (dropTitle: string) =>
    `[PRECTXE] ${t('주문 확인', '예약 확인')} — ${dropTitle}`,
  emailPreview: (dropTitle: string) =>
    `${t('주문 확인', '예약 확인')}: ${dropTitle}`,
} as const;
