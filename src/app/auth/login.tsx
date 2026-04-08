import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Button, Input, Text, YStack, XStack, Spinner } from 'tamagui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 認証済みなら tabs へ
  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  async function handleLogin() {
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (signInError) {
      setError('メールアドレスまたはパスワードが正しくありません');
    } else {
      router.replace('/(tabs)');
    }
  }

  return (
    <YStack flex={1} padding="$4" gap="$3" justifyContent="center">
      <Text fontSize="$6" fontWeight="bold" textAlign="center">
        ログイン
      </Text>

      <Input
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Input
        placeholder="パスワード"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {error !== '' && (
        <Text color="$red10" fontSize="$3">
          {error}
        </Text>
      )}

      <Button
        onPress={handleLogin}
        disabled={loading || email === '' || password === ''}
        icon={loading ? <Spinner /> : undefined}
      >
        ログイン
      </Button>

      <XStack justifyContent="center" gap="$2">
        <Text>アカウントをお持ちでないですか？</Text>
        <Text color="$blue10" onPress={() => router.push('/auth/signup')}>
          新規登録
        </Text>
      </XStack>
    </YStack>
  );
}
