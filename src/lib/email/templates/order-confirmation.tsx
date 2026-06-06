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
import type { Locale } from '@/i18n/config';
import { BUSINESS_INFO } from '@/lib/constants/business-info';
import { getSalesTerms } from '@/lib/constants/sales-terms';

interface OrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

interface OrderConfirmationProps {
  buyerName: string;
  orderNo: string;
  dropTitle: string;
  items: OrderItem[];
  totalAmount: number;
  ticketsUrl?: string;
  locale?: Locale;
}

export default function OrderConfirmation({
  buyerName,
  orderNo,
  dropTitle,
  items,
  totalAmount,
  ticketsUrl,
  locale = 'ko',
}: OrderConfirmationProps) {
  const en = locale === 'en';
  const ST = getSalesTerms(locale);
  const L = (ko: string, eng: string) => (en ? eng : ko);
  const fmtPrice = (n: number) =>
    en ? `₩${n.toLocaleString()}` : `${n.toLocaleString()}원`;
  return (
    <Html>
      <Head />
      <Preview>{ST.emailPreview(dropTitle)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>PRECTXE</Heading>
            <Text style={paragraph}>{ST.completedNotice(buyerName)}</Text>

            <Section style={orderBox}>
              <Text style={orderLabel}>{ST.orderNumber}</Text>
              <Text style={orderValue}>{orderNo}</Text>
            </Section>

            <Hr style={hr} />

            <Text style={sectionTitle}>{dropTitle}</Text>

            {items.map((item, i) => (
              <Section key={i} style={itemRow}>
                <Text style={itemName}>
                  {item.name} × {item.quantity}
                </Text>
                <Text style={itemPrice}>{fmtPrice(item.subtotal)}</Text>
              </Section>
            ))}

            <Hr style={hr} />

            <Section style={totalRow}>
              <Text style={totalLabel}>{L('합계', 'Total')}</Text>
              <Text style={totalValue}>
                {totalAmount === 0 ? L('무료', 'Free') : fmtPrice(totalAmount)}
              </Text>
            </Section>

            {ticketsUrl && (
              <>
                <Hr style={hr} />
                <Section style={ticketCta}>
                  <Text style={ticketCtaTitle}>
                    {L('입장권 (QR 코드)', 'Tickets (QR code)')}
                  </Text>
                  <Text style={ticketCtaText}>
                    {L(
                      '공연 당일 아래 페이지의 QR 코드를 운영자에게 보여주시면 입장이 가능합니다. 링크를 즐겨찾기하거나 일행과 공유하세요.',
                      'On the event day, show the QR code on the page below to staff to enter. Bookmark the link or share it with your group.'
                    )}
                  </Text>
                  <Button href={ticketsUrl} style={ticketButton}>
                    {L('입장권 보기 →', 'View tickets →')}
                  </Button>
                </Section>
              </>
            )}

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
  fontSize: '16px',
  fontWeight: '600' as const,
  marginBottom: '12px',
};

const itemRow = {
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
  marginBottom: '8px',
};

const itemName = {
  color: '#525f7f',
  fontSize: '14px',
  margin: '0',
};

const itemPrice = {
  color: '#0a0a0a',
  fontSize: '14px',
  fontWeight: '500' as const,
  margin: '0',
  textAlign: 'right' as const,
};

const totalRow = {
  display: 'flex' as const,
  justifyContent: 'space-between' as const,
};

const totalLabel = {
  color: '#0a0a0a',
  fontSize: '16px',
  fontWeight: '600' as const,
  margin: '0',
};

const totalValue = {
  color: '#0a0a0a',
  fontSize: '20px',
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

const ticketCta = {
  textAlign: 'center' as const,
  marginTop: '8px',
  marginBottom: '8px',
};

const ticketCtaTitle = {
  color: '#0a0a0a',
  fontSize: '14px',
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  margin: '0 0 8px',
};

const ticketCtaText = {
  color: '#525f7f',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '0 0 16px',
};

const ticketButton = {
  backgroundColor: '#0a0a0a',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '600' as const,
  padding: '12px 28px',
  textDecoration: 'none',
};
