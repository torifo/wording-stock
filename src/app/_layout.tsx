import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { tamaguiConfig } from '../tamagui.config';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth/login" options={{ title: 'ログイン', headerShown: false }} />
          <Stack.Screen name="auth/signup" options={{ title: '新規登録', headerShown: false }} />
          <Stack.Screen name="post" options={{ title: '投稿する', presentation: 'modal' }} />
        </Stack>
      </AuthProvider>
    </TamaguiProvider>
  );
}
