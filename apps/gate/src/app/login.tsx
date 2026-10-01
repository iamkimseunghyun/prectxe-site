import {
  type RequestCodeResponse,
  requestCodeBody,
  type VerifyCodeResponse,
  verifyCodeBody,
} from '@prectxe/gate-contract';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ErrorText, Field } from '@/components/ui';
import { colors, space } from '@/constants/theme';
import { api, GateApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  // request-code가 돌려준 요청 ID. 코드는 이 요청에 묶여 있다
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (e: unknown) =>
    setError(e instanceof GateApiError ? e.message : '문제가 생겼습니다.');

  const requestCode = async () => {
    const parsed = requestCodeBody.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '이메일을 확인해주세요.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await api<RequestCodeResponse>('/auth/request-code', {
        method: 'POST',
        body: parsed.data,
      });
      setChallengeId(res.challengeId);
      setCode('');
    } catch (e) {
      fail(e);
    } finally {
      setPending(false);
    }
  };

  const verify = async () => {
    if (!challengeId) return;
    const parsed = verifyCodeBody.safeParse({ email, challengeId, code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '코드를 확인해주세요.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await api<VerifyCodeResponse>('/auth/verify', {
        method: 'POST',
        body: parsed.data,
      });
      await signIn({ token: res.token, staff: res.staff });
    } catch (e) {
      fail(e);
      setPending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>PRECTXE Gate</Text>
          <Text style={styles.subtitle}>
            {challengeId
              ? `${email}로 보낸 6자리 코드를 입력해주세요. 메일이 안 보이면 스팸함도 확인해주세요.`
              : '주최자가 스태프로 등록한 이메일로 로그인합니다.'}
          </Text>
        </View>

        {challengeId ? (
          <View style={styles.form}>
            <Field
              label="로그인 코드"
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              onSubmitEditing={verify}
            />
            <ErrorText>{error}</ErrorText>
            <Button
              label="로그인"
              onPress={verify}
              loading={pending}
              disabled={code.length !== 6}
            />
            <Button
              label="코드 다시 받기"
              variant="ghost"
              onPress={requestCode}
              disabled={pending}
            />
            <Button
              label="다른 이메일로"
              variant="ghost"
              onPress={() => {
                setChallengeId(null);
                setError(null);
              }}
              disabled={pending}
            />
          </View>
        ) : (
          <View style={styles.form}>
            <Field
              label="이메일"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              onSubmitEditing={requestCode}
            />
            <ErrorText>{error}</ErrorText>
            <Button
              label="코드 받기"
              onPress={requestCode}
              loading={pending}
              disabled={!email.trim()}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: space.lg,
    gap: space.xl,
  },
  header: { gap: space.sm },
  title: { color: colors.text, fontSize: 32, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 22 },
  form: { gap: space.md },
});
