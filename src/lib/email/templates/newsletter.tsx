import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface NewsletterProps {
  title: string;
  message: string;
  ctaText?: string;
  ctaUrl?: string;
}

export default function Newsletter({
  title,
  message,
  ctaText,
  ctaUrl,
}: NewsletterProps) {
  const previewText = title;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>PRECTXE</Heading>
            <Heading style={subheading}>{title}</Heading>
            <Text style={messageText}>{message}</Text>
            {ctaText && ctaUrl && (
              <Button style={button} href={ctaUrl}>
                {ctaText}
              </Button>
            )}
            <Text style={footer}>
              이 메일은 PRECTXE에서 발송되었습니다.
              <br />
              더 이상 메일을 받지 않으려면 회신으로 알려주세요.
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
  marginBottom: '8px',
};

const subheading = {
  fontSize: '20px',
  fontWeight: '500',
  lineHeight: '32px',
  marginBottom: '24px',
  color: '#0a0a0a',
};

const messageText = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
  marginBottom: '24px',
  whiteSpace: 'pre-wrap' as const,
};

const button = {
  backgroundColor: '#0a0a0a',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
  marginBottom: '32px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '32px',
  textAlign: 'center' as const,
};
