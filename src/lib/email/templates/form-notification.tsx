import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'react-email';

interface FormNotificationProps {
  recipientName?: string;
  formTitle: string;
  message: string;
  /**
   * 수신 거부 링크. 단체 발송에서는 `UNSUBSCRIBE_URL_PLACEHOLDER`를 넘기고,
   * sendEmail이 수신자별 URL로 치환한다.
   * 넘기지 않으면 링크를 렌더하지 않는다.
   */
  unsubscribeUrl?: string;
}

export default function FormNotification({
  recipientName,
  formTitle,
  message,
  unsubscribeUrl,
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
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 어드민이 작성한 신뢰된 이메일 본문 HTML을 그대로 렌더 */}
            <div dangerouslySetInnerHTML={{ __html: message }} />
            <Text style={footer}>
              이 메일은 PRECTXE에서 발송되었습니다.
              {unsubscribeUrl && (
                <>
                  <br />
                  <Link href={unsubscribeUrl} style={unsubscribeLink}>
                    수신 거부
                  </Link>
                </>
              )}
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

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '20px',
  marginTop: '32px',
  textAlign: 'center' as const,
};

const unsubscribeLink = {
  color: '#8898aa',
  textDecoration: 'underline',
};
