import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email';
import type { Locale } from '@/i18n/config';
import { BUSINESS_INFO } from '@/lib/constants/business-info';
import { getSalesTerms } from '@/lib/constants/sales-terms';
import { formatKstExpiry } from '@/lib/utils';

interface BankTransferPendingProps {
  buyerName: string;
  orderNo: string;
  dropTitle: string;
  totalAmount: number;
  depositorName: string;
  expiresAt: Date | string;
  expiryHours: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  locale?: Locale;
}

export default function BankTransferPending({
  buyerName,
  orderNo,
  dropTitle,
  totalAmount,
  depositorName,
  expiresAt,
  expiryHours,
  bankName,
  accountNumber,
  accountHolder,
  locale = 'ko',
}: BankTransferPendingProps) {
  const en = locale === 'en';
  const ST = getSalesTerms(locale);
  const L = (ko: string, eng: string) => (en ? eng : ko);
  const fmtPrice = (n: number) =>
    en ? `₩${n.toLocaleString()}` : `${n.toLocaleString()}원`;
  return (
    <Html>
      <Head />
      <Preview>
        {L(`입금 안내: ${dropTitle}`, `Payment instructions: ${dropTitle}`)}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>PRECTXE</Heading>
            <Text style={paragraph}>
              {ST.receivedNotice(buyerName)}{' '}
              {L(
                '아래 안내에 따라',
                'Please follow the instructions below and'
              )}
              <strong>
                {' '}
                {L(
                  `${expiryHours}시간 이내에 입금`,
                  `complete payment within ${expiryHours} hours`
                )}
              </strong>
              {L('해주세요.', '.')}
            </Text>

            <Section style={orderBox}>
              <Text style={orderLabel}>{ST.orderNumber}</Text>
              <Text style={orderValue}>{orderNo}</Text>
            </Section>

            <Hr style={hr} />

            <Text style={sectionTitle}>{dropTitle}</Text>
            <Section style={amountRow}>
              <Text style={totalLabel}>{L('결제 금액', 'Amount')}</Text>
              <Text style={totalValue}>{fmtPrice(totalAmount)}</Text>
            </Section>

            <Hr style={hr} />

            <Text style={sectionTitle}>{L('입금 계좌', 'Bank account')}</Text>
            <Section style={infoBox}>
              <Section style={infoRow}>
                <Text style={infoLabel}>{L('은행', 'Bank')}</Text>
                <Text style={infoValue}>{bankName}</Text>
              </Section>
              <Section style={infoRow}>
                <Text style={infoLabel}>{L('계좌번호', 'Account no.')}</Text>
                <Text style={infoValueMono}>{accountNumber}</Text>
              </Section>
              <Section style={infoRow}>
                <Text style={infoLabel}>{L('예금주', 'Account holder')}</Text>
                <Text style={infoValue}>{accountHolder}</Text>
              </Section>
            </Section>

            <Section style={highlightBox}>
              <Text style={highlightLabel}>
                {L('입금자명 (반드시 일치)', 'Depositor name (must match)')}
              </Text>
              <Text style={highlightValue}>{depositorName}</Text>
              <Text style={highlightHint}>
                {L(
                  '동명이인 매칭을 위해 위 형태 그대로 입금해 주세요.',
                  'To distinguish identical names, please transfer using the exact format above.'
                )}
              </Text>
            </Section>

            <Section style={warnBox}>
              <Text style={warnText}>
                <strong>{L('입금 마감', 'Payment deadline')}</strong>:{' '}
                {formatKstExpiry(expiresAt)}
              </Text>
              <Text style={warnSub}>{ST.autoCancelNotice}</Text>
            </Section>

            <Text style={footer}>
              {L(
                `이 메일은 발신 전용입니다. 회신은 수신되지 않습니다. 문의는 ${BUSINESS_INFO.email}로 보내 주세요.`,
                `This is a send-only email; replies are not received. For inquiries, contact ${BUSINESS_INFO.email}.`
              )}
            </Text>
            <Text style={footerBrand}>PRECTXE</Text>
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

const heading = {
  fontSize: '24px',
  fontWeight: '600' as const,
  lineHeight: '40px',
  marginBottom: '20px',
};

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '24px',
};

const orderBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '4px',
  padding: '16px',
  marginBottom: '24px',
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

const amountRow = {
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
  marginBottom: '8px',
};

const infoBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '4px',
  padding: '16px',
  marginBottom: '20px',
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

const highlightBox = {
  backgroundColor: '#fff8e1',
  border: '1px solid #ffd54f',
  borderRadius: '4px',
  padding: '16px',
  marginBottom: '20px',
};

const highlightLabel = {
  color: '#7a5b00',
  fontSize: '12px',
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  margin: '0 0 6px',
};

const highlightValue = {
  color: '#0a0a0a',
  fontSize: '20px',
  fontWeight: '700' as const,
  fontFamily: 'monospace',
  margin: '0 0 8px',
};

const highlightHint = {
  color: '#7a5b00',
  fontSize: '12px',
  margin: '0',
};

const warnBox = {
  backgroundColor: '#fff5f5',
  border: '1px solid #fc8181',
  borderRadius: '4px',
  padding: '14px',
  marginBottom: '20px',
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

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '32px',
  textAlign: 'center' as const,
};

const footerBrand = {
  color: '#8898aa',
  fontSize: '12px',
  textAlign: 'center' as const,
  marginTop: '8px',
};
