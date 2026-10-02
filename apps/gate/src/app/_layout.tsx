import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const auth = useAuth();

  useEffect(() => {
    if (auth.status !== 'loading') SplashScreen.hideAsync();
  }, [auth.status]);

  // 저장된 로그인을 확인하는 동안은 스플래시를 그대로 둔다
  if (auth.status === 'loading') return null;
  const signedIn = auth.status === 'signedIn';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        headerBackTitle: '뒤로',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ title: '행사' }} />
        <Stack.Screen name="drops/[id]/index" options={{ title: '' }} />
        <Stack.Screen
          name="drops/[id]/scan"
          options={{ headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="drops/[id]/search"
          options={{ title: '명단 검색' }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
