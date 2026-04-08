import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { TamaguiProvider } from 'tamagui';
import { tamaguiConfig } from '../tamagui.config';

export default function RootLayout() {
  return (
    <TamaguiProvider config={tamaguiConfig}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ title: 'ログイン' }} />
        <Stack.Screen name="auth/signup" options={{ title: '新規登録' }} />
        <Stack.Screen name="post" options={{ title: '投稿する', presentation: 'modal' }} />
      </Stack>
    </TamaguiProvider>
  );
}
