import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import {
  Button,
  Input,
  Text,
  YStack,
  XStack,
  Spinner,
  Separator,
} from 'tamagui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal="$4" gap="$5">
      <YStack width="100%" maxWidth={440} gap="$5">
        {/* アプリロゴ・タイトル */}
        <YStack alignItems="center" gap="$2">
          <Text fontSize={32} fontWeight="800" letterSpacing={-0.5} color="$color12">
            Wording Stock
          </Text>
          <Text fontSize="$3" color="$color9" textAlign="center">
            日本語の豊かな表現を、あなたの手に。
          </Text>
        </YStack>

        {/* ログインカード */}
        <YStack
          backgroundColor="$background"
          borderRadius="$6"
          padding="$5"
          gap="$4"
          shadowColor="$shadowColor"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.08}
          shadowRadius={12}
          elevation={4}
          borderWidth={1}
          borderColor="$borderColor"
        >
          <Text fontSize="$5" fontWeight="700" color="$color12">
            ログイン
          </Text>

          <YStack gap="$3">
            <Input
              placeholder="メールアドレス"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              size="$4"
              borderRadius="$4"
            />
            <Input
              placeholder="パスワード"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              size="$4"
              borderRadius="$4"
            />
          </YStack>

          {error !== '' && (
            <XStack
              backgroundColor="$red2"
              borderRadius="$3"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderLeftWidth={3}
              borderLeftColor="$red9"
            >
              <Text color="$red10" fontSize="$2">
                {error}
              </Text>
            </XStack>
          )}

          <Button
            size="$4"
            borderRadius="$4"
            fontWeight="700"
            backgroundColor="$blue9"
            color="white"
            pressStyle={{ backgroundColor: '$blue10' }}
            onPress={handleLogin}
            disabled={loading || email === '' || password === ''}
            opacity={loading || email === '' || password === '' ? 0.5 : 1}
            icon={loading ? <Spinner color="white" /> : undefined}
          >
            {loading ? '' : 'ログイン'}
          </Button>

          <XStack alignItems="center" gap="$3">
            <Separator flex={1} />
            <Text fontSize="$2" color="$color8">または</Text>
            <Separator flex={1} />
          </XStack>

          {/* Google ログイン（準備中） */}
          <Button
            size="$4"
            borderRadius="$4"
            variant="outlined"
            disabled
            opacity={0.4}
          >
            Google でログイン（準備中）
          </Button>
        </YStack>

        {/* 新規登録リンク */}
        <XStack justifyContent="center" gap="$2">
          <Text color="$color9" fontSize="$3">
            アカウントをお持ちでないですか？
          </Text>
          <Text
            color="$blue10"
            fontSize="$3"
            fontWeight="600"
            onPress={() => router.push('/auth/signup')}
          >
            新規登録
          </Text>
        </XStack>
      </YStack>
      </YStack>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
