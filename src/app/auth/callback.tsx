import { useEffect, useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Spinner, Text, XStack, YStack } from 'tamagui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function AuthCallbackScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ code?: string; error?: string; error_description?: string; mode?: string }>();
  const [message, setMessage] = useState('Google ログインを完了しています...');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function completeOAuth() {
      const mode = typeof params.mode === 'string' ? params.mode : 'login';
      const code = typeof params.code === 'string' ? params.code : undefined;
      const hashParams =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? new URLSearchParams(window.location.hash.replace(/^#/, ''))
          : null;
      const providerError =
        typeof params.error_description === 'string'
          ? params.error_description
          : typeof params.error === 'string'
            ? params.error
            : hashParams?.get('error_description') ?? hashParams?.get('error') ?? '';

      if (providerError) {
        if (!cancelled) {
          setError(mode === 'link' ? 'Google 連携を完了できませんでした' : 'Google ログインを完了できませんでした');
          setMessage(providerError);
        }
        return;
      }

      if (!code) {
        if (session) {
          router.replace(mode === 'link' ? '/profile?linked=google' : '/(tabs)');
          return;
        }

        if (!cancelled) {
          setError('認証コードが見つかりません');
          setMessage('Google 認証の戻り先 URL を確認してください');
        }
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        if (!cancelled) {
          setError(mode === 'link' ? 'Google 連携を完了できませんでした' : 'Google ログインを完了できませんでした');
          setMessage(exchangeError.message);
        }
        return;
      }

      if (!cancelled) {
        router.replace(mode === 'link' ? '/profile?linked=google' : '/(tabs)');
      }
    }

    completeOAuth();

    return () => {
      cancelled = true;
    };
  }, [params.code, params.error, params.error_description, params.mode, session]);

  if (session && !params.code && !params.error && !params.error_description) {
    return <Redirect href={params.mode === 'link' ? '/profile' : '/(tabs)'} />;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <YStack
        flex={1}
        justifyContent="center"
        alignItems="center"
        paddingHorizontal="$4"
        gap="$4"
        backgroundColor="#FFF5F7"
      >
        <YStack
          width="100%"
          maxWidth={440}
          backgroundColor="white"
          borderRadius="$6"
          padding="$5"
          gap="$4"
          borderWidth={1}
          borderColor="#FFD0DC"
          shadowColor="#BC002D"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.08}
          shadowRadius={12}
          elevation={4}
        >
          <Text fontSize="$5" fontWeight="700" color="#111">
            {params.mode === 'link' ? 'Google アカウント連携' : 'Google ログイン'}
          </Text>

          {error === '' ? (
            <XStack alignItems="center" gap="$3">
              <Spinner color="#BC002D" />
              <Text color="#555" fontSize="$3">
                {message}
              </Text>
            </XStack>
          ) : (
            <YStack gap="$3">
              <Text color="#BC002D" fontSize="$3" fontWeight="600">
                {error}
              </Text>
              <Text color="#666" fontSize="$3">
                {message}
              </Text>
              <Button
                size="$4"
                borderRadius="$4"
                backgroundColor="#BC002D"
                color="white"
                onPress={() => router.replace(params.mode === 'link' ? '/profile' : '/auth/login')}
              >
                {params.mode === 'link' ? 'プロフィールへ戻る' : 'ログイン画面へ戻る'}
              </Button>
            </YStack>
          )}
        </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}
