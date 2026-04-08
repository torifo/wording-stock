import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { tamaguiConfig } from '../tamagui.config';
import { AuthProvider, useAuth } from '../context/AuthContext';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!session && !inAuthGroup) {
      // 未認証 → ログイン画面へ
      router.replace('/auth/login');
    } else if (session && inAuthGroup) {
      // 認証済み → タイムラインへ
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <AuthProvider>
        <NavigationGuard>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ title: 'ログイン', headerShown: false }} />
            <Stack.Screen name="auth/signup" options={{ title: '新規登録', headerShown: false }} />
            <Stack.Screen name="post" options={{ title: '投稿する', presentation: 'modal' }} />
          </Stack>
        </NavigationGuard>
      </AuthProvider>
    </TamaguiProvider>
  );
}
