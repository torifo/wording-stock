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

export default function SignupScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal="$4" gap="$5">
      <YStack width="100%" maxWidth={440} gap="$5">
        {/* アプリロゴ・タイトル */}
        <YStack alignItems="center" gap="$2">
          <Text fontSize={32} fontWeight="800" letterSpacing={-0.5} color="$blue9">
            Wording Stock
          </Text>
          <Text fontSize="$3" color="$color9" textAlign="center">
            日本語の豊かな表現を、あなたの手に。
          </Text>
        </YStack>

        {/* 新規登録カード */}
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
            新規登録
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
            <YStack gap="$1">
              <Input
                placeholder="パスワード（8文字以上）"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                size="$4"
                borderRadius="$4"
              />
              <Text fontSize="$1" color="$color8" paddingLeft="$1">
                8文字以上で設定してください
              </Text>
            </YStack>
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
            onPress={handleSignup}
            disabled={loading || email === '' || password === ''}
            opacity={loading || email === '' || password === '' ? 0.5 : 1}
            icon={loading ? <Spinner color="white" /> : undefined}
          >
            {loading ? '' : '登録する'}
          </Button>

          <XStack alignItems="center" gap="$3">
            <Separator flex={1} />
            <Text fontSize="$2" color="$color8">または</Text>
            <Separator flex={1} />
          </XStack>

          {/* Google 登録（準備中） */}
          <Button
            size="$4"
            borderRadius="$4"
            variant="outlined"
            disabled
            opacity={0.4}
          >
            Google で登録（準備中）
          </Button>
        </YStack>

        {/* ログインリンク */}
        <XStack justifyContent="center" gap="$2">
          <Text color="$color9" fontSize="$3">
            すでにアカウントをお持ちですか？
          </Text>
          <Text
            color="$blue10"
            fontSize="$3"
            fontWeight="600"
            onPress={() => router.push('/auth/login')}
          >
            ログイン
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
