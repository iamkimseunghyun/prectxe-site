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
} from '@react-email/components';

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
}

export default function OrderConfirmation({
  buyerName,
  orderNo,
  dropTitle,
  items,
  totalAmount,
}: OrderConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>주문 확인: {dropTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>PRECTXE</Heading>
            <Text style={paragraph}>
              안녕하세요 {buyerName}님, 주문이 완료되었습니다.
            </Text>

            <Section style={orderBox}>
              <Text style={orderLabel}>주문번호</Text>
              <Text style={orderValue}>{orderNo}</Text>
            </Section>

            <Hr style={hr} />

            <Text style={sectionTitle}>{dropTitle}</Text>

            {items.map((item, i) => (
              <Section key={i} style={itemRow}>
                <Text style={itemName}>
                  {item.name} × {item.quantity}
                </Text>
                <Text style={itemPrice}>
                  {item.subtotal.toLocaleString()}원
                </Text>
              </Section>
            ))}

            <Hr style={hr} />

            <Section style={totalRow}>
              <Text style={totalLabel}>합계</Text>
              <Text style={totalValue}>
                {totalAmount === 0
                  ? '무료'
                  : `${totalAmount.toLocaleString()}원`}
              </Text>
            </Section>

            <Text style={footer}>문의사항이 있으시면 답장해 주세요.</Text>
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
