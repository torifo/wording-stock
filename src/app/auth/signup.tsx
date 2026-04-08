import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { Button, Input, Text, YStack, XStack, Spinner } from 'tamagui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function SignupScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 認証済みなら tabs へ
  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  async function handleSignup() {
    if (password.length < 8) {
      setError('パスワードは 8 文字以上で入力してください');
      return;
    }
    setLoading(true);
    setError('');

    const { error: signUpError } = await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
    } else {
      router.replace('/auth/login');
    }
  }

  return (
    <YStack flex={1} padding="$4" gap="$3" justifyContent="center">
      <Text fontSize="$6" fontWeight="bold" textAlign="center">
        新規登録
      </Text>

      <Input
        placeholder="メールアドレス"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Input
        placeholder="パスワード（8文字以上）"
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
        onPress={handleSignup}
        disabled={loading || email === '' || password === ''}
        icon={loading ? <Spinner /> : undefined}
      >
        登録する
      </Button>

      <XStack justifyContent="center" gap="$2">
        <Text>すでにアカウントをお持ちですか？</Text>
        <Text color="$blue10" onPress={() => router.push('/auth/login')}>
          ログイン
        </Text>
      </XStack>
    </YStack>
  );
}
