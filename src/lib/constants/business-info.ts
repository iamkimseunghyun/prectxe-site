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
  serviceUrl: 'https://prectxe.com',
} as const;
