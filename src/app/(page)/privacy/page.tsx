import type { Metadata } from 'next';
import { LegalPageLayout } from '@/components/layout/legal-page-layout';
import { BUSINESS_INFO } from '@/lib/constants/business-info';

export const metadata: Metadata = {
  title: '개인정보처리방침 | PRECTXE',
  description: 'PRECTXE 개인정보처리방침',
  robots: { index: false, follow: true },
};

const EFFECTIVE_DATE = '2026년 4월 20일';

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="개인정보처리방침" effectiveDate={EFFECTIVE_DATE}>
      <p>
        {BUSINESS_INFO.companyName}(이하 "회사")는 이용자의 개인정보를 소중히
        여기며, <strong>개인정보보호법</strong>,{' '}
        <strong>정보통신망 이용촉진 및 정보보호 등에 관한 법률</strong> 등 관련
        법령을 준수하고 있습니다. 이 방침은 회사가 PRECTXE 사이트(
        {BUSINESS_INFO.serviceUrl})를 통해 수집하는 개인정보의 항목과 목적,
        보유기간, 이용자의 권리 등을 안내합니다.
      </p>

      <h2>1. 수집하는 개인정보 항목</h2>
      <p>회사는 서비스 제공을 위해 다음의 최소 정보를 수집합니다.</p>
      <h3>티켓·굿즈 구매 시</h3>
      <ul>
        <li>이름, 이메일, 전화번호 (주문 확인 및 배송·발권 목적)</li>
        <li>결제 정보(카드사·승인번호 등 결제대행사 전달 정보)</li>
        <li>배송 주소 (굿즈 구매 시에 한함)</li>
      </ul>
      <h3>참가 신청·설문 제출 시</h3>
      <ul>
        <li>양식에 명시된 항목(이름, 이메일 등) — 양식마다 상이함</li>
      </ul>
      <h3>자동 수집 항목</h3>
      <ul>
        <li>IP 주소, 쿠키, 접속 로그, 브라우저·기기 정보 (서비스 개선 목적)</li>
        <li>Google Analytics를 통한 이용 통계(식별 불가능한 형태로 처리)</li>
      </ul>

      <h2>2. 수집 및 이용 목적</h2>
      <ul>
        <li>주문 처리, 결제 확인, 티켓 발권 및 상품 배송</li>
        <li>주문 관련 안내 및 고객 문의 응대</li>
        <li>서비스 개선 및 통계 분석</li>
        <li>법령에 따른 의무 이행(전자상거래법상 기록 보관 등)</li>
      </ul>

      <h2>3. 보유 및 이용 기간</h2>
      <p>
        수집된 개인정보는 이용 목적이 달성되면 지체 없이 파기합니다. 다만 관련
        법령에 따라 다음 기간 동안 보관됩니다.
      </p>
      <table>
        <thead>
          <tr>
            <th>보관 항목</th>
            <th>근거 법령</th>
            <th>보관 기간</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>계약 또는 청약철회 등에 관한 기록</td>
            <td>전자상거래법</td>
            <td>5년</td>
          </tr>
          <tr>
            <td>대금결제 및 재화 공급에 관한 기록</td>
            <td>전자상거래법</td>
            <td>5년</td>
          </tr>
          <tr>
            <td>소비자 불만 또는 분쟁처리에 관한 기록</td>
            <td>전자상거래법</td>
            <td>3년</td>
          </tr>
          <tr>
            <td>접속 로그</td>
            <td>통신비밀보호법</td>
            <td>3개월</td>
          </tr>
        </tbody>
      </table>

      <h2>4. 개인정보의 제3자 제공</h2>
      <p>
        회사는 이용자의 개인정보를 본 방침에서 고지한 범위 내에서만 이용하며,
        이용자의 사전 동의 없이 외부에 제공하지 않습니다. 단, 다음의 경우는
        예외입니다.
      </p>
      <ul>
        <li>법령에 의해 요구되는 경우</li>
        <li>
          티켓·굿즈 배송을 위해 배송업체에 필요한 최소 정보(수령인 이름, 주소,
          연락처)를 제공하는 경우
        </li>
      </ul>

      <h2>5. 개인정보 처리 위탁</h2>
      <p>회사는 서비스 제공을 위해 다음 업체에 개인정보 처리를 위탁합니다.</p>
      <table>
        <thead>
          <tr>
            <th>수탁자</th>
            <th>위탁 업무</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>PortOne (아임포트)</td>
            <td>결제 처리 및 결제 검증</td>
          </tr>
          <tr>
            <td>토스페이먼츠 등 결제대행사</td>
            <td>카드·간편결제 승인 및 정산</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>주문 확인·안내 이메일 발송</td>
          </tr>
          <tr>
            <td>Aligo / Solapi</td>
            <td>SMS 알림 발송 (선택적)</td>
          </tr>
          <tr>
            <td>{BUSINESS_INFO.hostingService}</td>
            <td>웹사이트 호스팅 및 서버 운영</td>
          </tr>
          <tr>
            <td>Neon Database</td>
            <td>데이터베이스 호스팅</td>
          </tr>
          <tr>
            <td>Cloudflare</td>
            <td>이미지·동영상 저장 및 전송</td>
          </tr>
          <tr>
            <td>Google Analytics</td>
            <td>이용 통계 분석(익명 집계)</td>
          </tr>
        </tbody>
      </table>

      <h2>6. 이용자의 권리</h2>
      <p>
        이용자는 언제든 자신의 개인정보에 대해 다음 권리를 행사할 수 있습니다.
      </p>
      <ul>
        <li>개인정보 열람, 정정·삭제, 처리 정지 요청</li>
        <li>개인정보 수집·이용·제공에 대한 동의 철회</li>
      </ul>
      <p>
        요청은 이메일{' '}
        <a href={`mailto:${BUSINESS_INFO.email}`}>{BUSINESS_INFO.email}</a>로
        접수해 주시면, 관련 법령이 정한 기간 내에 지체 없이 조치합니다.
      </p>

      <h2>7. 쿠키의 운영</h2>
      <p>
        회사는 서비스 개선과 통계 분석을 위해 쿠키(Cookie)를 사용합니다.
        이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 일부 서비스
        이용에 제한이 있을 수 있습니다.
      </p>

      <h2>8. 개인정보의 안전성 확보</h2>
      <p>회사는 개인정보 보호를 위해 기술적·관리적 조치를 취하고 있습니다.</p>
      <ul>
        <li>전송 구간 HTTPS(SSL/TLS) 암호화</li>
        <li>데이터베이스 접근 권한 최소화 및 관리자 인증</li>
        <li>카드 정보는 회사가 직접 저장하지 않으며 결제대행사에서 토큰화</li>
        <li>접근 로그의 정기 모니터링</li>
      </ul>

      <h2>9. 개인정보보호 책임자</h2>
      <p>
        회사는 개인정보 처리에 관한 업무를 총괄하는 개인정보보호 책임자를
        지정하고 있습니다.
      </p>
      <ul>
        <li>책임자: {BUSINESS_INFO.representative}</li>
        <li>
          연락처:{' '}
          <a href={`mailto:${BUSINESS_INFO.email}`}>{BUSINESS_INFO.email}</a>
        </li>
      </ul>

      <h2>10. 변경 고지</h2>
      <p>
        본 방침이 변경될 경우 사이트 공지사항을 통해 최소 7일 전에 고지합니다.
        중요한 내용이 변경되는 경우에는 30일 전에 고지합니다.
      </p>

      <h2>부칙</h2>
      <p>본 방침은 {EFFECTIVE_DATE}부터 시행합니다.</p>
    </LegalPageLayout>
  );
}
