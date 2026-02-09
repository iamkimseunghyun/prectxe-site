import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface FormNotificationProps {
  recipientName?: string;
  formTitle: string;
  message: string;
}

export default function FormNotification({
  recipientName,
  formTitle,
  message,
}: FormNotificationProps) {
  const previewText = `${formTitle} 관련 알림`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>PRECTXE</Heading>
            {recipientName && (
              <Text style={paragraph}>안녕하세요 {recipientName}님,</Text>
            )}
            <Text style={paragraph}>{formTitle} 관련하여 알려드립니다.</Text>
            <Text style={messageText}>{message}</Text>
            <Text style={footer}>
              이 메일은 PRECTXE에서 발송되었습니다.
            </Text>
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
};

const box = {
  padding: '0 48px',
};

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '40px',
  marginBottom: '20px',
};

const paragraph = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  marginBottom: '16px',
};

const messageText = {
  color: '#0a0a0a',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  marginBottom: '24px',
  padding: '16px',
  backgroundColor: '#f6f9fc',
  borderRadius: '4px',
  whiteSpace: 'pre-wrap' as const,
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '32px',
  textAlign: 'center' as const,
};
