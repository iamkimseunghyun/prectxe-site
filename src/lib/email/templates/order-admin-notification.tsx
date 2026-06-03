import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email';

interface OrderAdminNotificationProps {
  dropTitle: string;
  orderNo: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  depositorName: string;
  totalAmount: number;
  itemsSummary: string;
  expiresAt: Date | string;
  orderAdminUrl: string;
}

function formatDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  // 서버(UTC)에서도 KST(UTC+9)로 표시 — 프로젝트 KST 변환 관례(+9h offset)와 일관
  const kst = new Date(date.getTime() + 9 * 3600 * 1000);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mi = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

/**
 * 운영자용 새 주문(무통장) 알림. 입금 대기 건을 놓치지 않도록 구매자 정보와
 * 어드민 주문 페이지 링크를 담는다. (구매자가 아닌 운영자에게 발송)
 */
export default function OrderAdminNotification({
  dropTitle,
  orderNo,
  buyerName,
  buyerPhone,
  buyerEmail,
  depositorName,
  totalAmount,
  itemsSummary,
  expiresAt,
  orderAdminUrl,
}: OrderAdminNotificationProps) {
  return (
    <Html>
      <Head />
      <Preview>
        새 무통장 주문 — {dropTitle} / {buyerName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Text style={kicker}>새 무통장 주문 · 입금 대기</Text>
            <Heading style={heading}>{dropTitle}</Heading>

            <Section style={orderBox}>
              <Text style={orderLabel}>주문번호</Text>
              <Text style={orderValue}>{orderNo}</Text>
            </Section>

            <Hr style={hr} />

            <Text style={sectionTitle}>구매자</Text>
            <Section style={infoBox}>
              <Section style={infoRow}>
                <Text style={infoLabel}>이름</Text>
                <Text style={infoValue}>{buyerName}</Text>
              </Section>
              <Section style={infoRow}>
                <Text style={infoLabel}>연락처</Text>
                <Text style={infoValue}>{buyerPhone}</Text>
              </Section>
              <Section style={infoRow}>
                <Text style={infoLabel}>이메일</Text>
                <Text style={infoValue}>{buyerEmail}</Text>
              </Section>
              <Section style={infoRow}>
                <Text style={infoLabel}>입금자명</Text>
                <Text style={infoValueMono}>{depositorName}</Text>
              </Section>
            </Section>

            <Hr style={hr} />

            <Text style={sectionTitle}>주문 내역</Text>
            <Text style={itemsText}>{itemsSummary}</Text>
            <Section style={amountRow}>
              <Text style={totalLabel}>결제 금액</Text>
              <Text style={totalValue}>{totalAmount.toLocaleString()}원</Text>
            </Section>

            <Section style={warnBox}>
              <Text style={warnText}>
                <strong>입금 마감</strong>: {formatDateTime(expiresAt)}
              </Text>
              <Text style={warnSub}>
                마감까지 미입금 시 자동 취소됩니다. 입금 확인 후 어드민에서
                처리해 주세요.
              </Text>
            </Section>

            <Section style={buttonWrap}>
              <Button href={orderAdminUrl} style={adminButton}>
                주문 관리 페이지 열기
              </Button>
            </Section>

            <Text style={footerBrand}>PRECTXE 운영 알림</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '520px',
};

const box = {
  padding: '0 48px',
};

const kicker = {
  color: '#c53030',
  fontSize: '12px',
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  margin: '0 0 4px',
};

const heading = {
  fontSize: '22px',
  fontWeight: '600' as const,
  lineHeight: '32px',
  marginBottom: '20px',
};

const orderBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '4px',
  padding: '16px',
  marginBottom: '20px',
};

const orderLabel = {
  color: '#8898aa',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  margin: '0 0 4px',
};

const orderValue = {
  color: '#0a0a0a',
  fontSize: '18px',
  fontWeight: '600' as const,
  fontFamily: 'monospace',
  margin: '0',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const sectionTitle = {
  color: '#0a0a0a',
  fontSize: '14px',
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: '12px',
};

const infoBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '4px',
  padding: '16px',
  marginBottom: '4px',
};

const infoRow = {
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
  marginBottom: '8px',
};

const infoLabel = {
  color: '#8898aa',
  fontSize: '13px',
  margin: '0',
};

const infoValue = {
  color: '#0a0a0a',
  fontSize: '14px',
  fontWeight: '500' as const,
  margin: '0',
  textAlign: 'right' as const,
};

const infoValueMono = {
  ...infoValue,
  fontFamily: 'monospace',
  fontSize: '15px',
};

const itemsText = {
  color: '#0a0a0a',
  fontSize: '14px',
  margin: '0 0 8px',
};

const amountRow = {
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
  marginBottom: '8px',
};

const totalLabel = {
  color: '#0a0a0a',
  fontSize: '14px',
  fontWeight: '500' as const,
  margin: '0',
};

const totalValue = {
  color: '#0a0a0a',
  fontSize: '18px',
  fontWeight: '700' as const,
  margin: '0',
  textAlign: 'right' as const,
};

const warnBox = {
  backgroundColor: '#fff5f5',
  border: '1px solid #fc8181',
  borderRadius: '4px',
  padding: '14px',
  margin: '20px 0',
};

const warnText = {
  color: '#c53030',
  fontSize: '14px',
  margin: '0 0 4px',
};

const warnSub = {
  color: '#742a2a',
  fontSize: '12px',
  margin: '0',
  lineHeight: '18px',
};

const buttonWrap = {
  textAlign: 'center' as const,
  margin: '24px 0 8px',
};

const adminButton = {
  backgroundColor: '#0a0a0a',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 28px',
  textDecoration: 'none',
};

const footerBrand = {
  color: '#8898aa',
  fontSize: '12px',
  textAlign: 'center' as const,
  marginTop: '16px',
};
