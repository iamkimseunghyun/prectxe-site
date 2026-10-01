import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'react-email';

interface StaffLoginCodeProps {
  code: string;
  expiresInMinutes: number;
  staffName?: string | null;
}

export default function StaffLoginCode({
  code,
  expiresInMinutes,
  staffName,
}: StaffLoginCodeProps) {
  return (
    <Html>
      <Head />
      <Preview>{`게이트 로그인 코드 ${code}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>PRECTXE GATE</Heading>
            <Text style={paragraph}>
              {staffName ? `${staffName}님, ` : ''}게이트 앱에 아래 코드를
              입력해주세요. {expiresInMinutes}분 동안 한 번만 쓸 수 있습니다.
            </Text>
            <Section style={codeBox}>
              <Text style={codeText}>{code}</Text>
            </Section>
            <Text style={note}>
              직접 요청하지 않았다면 이 메일은 무시하셔도 됩니다. 코드는
              누구와도 공유하지 마세요.
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

const codeBox = {
  backgroundColor: '#f6f9fc',
  borderRadius: '4px',
  padding: '20px',
  marginBottom: '24px',
  textAlign: 'center' as const,
};

const codeText = {
  color: '#0a0a0a',
  fontSize: '32px',
  fontWeight: '700' as const,
  fontFamily: 'monospace',
  letterSpacing: '0.3em',
  margin: '0',
};

const note = {
  color: '#8898aa',
  fontSize: '13px',
  lineHeight: '20px',
};
