/**
 * 전자상거래법상 온라인 판매 사업자가 공시해야 하는 정보.
 * 푸터와 법적 페이지(이용약관, 개인정보처리방침, 환불정책)에서 단일 출처로 참조.
 */
export const BUSINESS_INFO = {
  companyName: '라프 주식회사',
  representative: '김승현',
  businessNumber: '305-86-41633',
  /** 통신판매업 신고 완료 시 번호 채워넣기. null이면 "신고 예정"으로 표시됨 */
  mailOrderNumber: null as string | null,
  address: '서울특별시 강남구 영동대로 602, 6층 P282',
  phone: '02-6207-2077' as string | null,
  email: 'info@laaf.kr',
  hostingService: 'Vercel Inc.',
  serviceName: 'PRECTXE',
  serviceUrl: 'https://www.prectxe.com',
} as const;

/**
 * 새 무통장 주문 발생 시 알림 메일을 받을 운영자 주소.
 * ORDER_NOTIFICATION_EMAILS env(쉼표 구분)로 override 가능, 없으면 기본값 사용.
 */
export const ORDER_NOTIFICATION_EMAILS: string[] =
  process.env.ORDER_NOTIFICATION_EMAILS?.split(',')
    .map((e) => e.trim())
    .filter(Boolean) ?? ['ryu@laaf.kr', 'kaka@laaf.kr'];
