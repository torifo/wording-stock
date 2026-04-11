import { useState } from 'react';
import { Redirect, router } from 'expo-router';
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import {
  Button,
  Input,
  Text,
  YStack,
  XStack,
  Spinner,
  Separator,
} from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function SignupScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
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

  const isDisabled = loading || email === '' || password === '' || confirmPassword === '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <YStack flex={1} justifyContent="center" alignItems="center" paddingHorizontal="$4" gap="$5"
        backgroundColor="#FFF5F7">
        <YStack width="100%" maxWidth={440} gap="$5">
          {/* アプリロゴ・タイトル */}
          <YStack alignItems="center" gap="$2">
            <Text fontSize={32} fontWeight="800" letterSpacing={-0.5} color="#BC002D">
              Wording Stock
            </Text>
            <Text fontSize="$3" color="#888" textAlign="center">
              日本語の豊かな表現を、あなたの手に。
            </Text>
          </YStack>

          {/* 新規登録カード */}
          <YStack
            backgroundColor="white"
            borderRadius="$6"
            padding="$5"
            gap="$4"
            shadowColor="#BC002D"
            shadowOffset={{ width: 0, height: 4 }}
            shadowOpacity={0.08}
            shadowRadius={12}
            elevation={4}
            borderWidth={1}
            borderColor="#FFD0DC"
          >
            <Text fontSize="$5" fontWeight="700" color="#111">
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
                borderColor="#FFD0DC"
                focusStyle={{ borderColor: '#BC002D' }}
              />

              {/* パスワード */}
              <YStack gap="$1">
                <XStack alignItems="center">
                  <Input
                    flex={1}
                    placeholder="パスワード（8文字以上）"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    size="$4"
                    borderRadius="$4"
                    paddingRight="$10"
                    borderColor="#FFD0DC"
                    focusStyle={{ borderColor: '#BC002D' }}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#BC002D"
                    />
                  </TouchableOpacity>
                </XStack>
                <Text fontSize="$1" color="#aaa" paddingLeft="$1">
                  8文字以上で設定してください
                </Text>
              </YStack>

              {/* パスワード確認 */}
              <XStack alignItems="center">
                <Input
                  flex={1}
                  placeholder="パスワード（確認）"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  size="$4"
                  borderRadius="$4"
                  paddingRight="$10"
                  borderColor="#FFD0DC"
                  focusStyle={{ borderColor: '#BC002D' }}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#BC002D"
                  />
                </TouchableOpacity>
              </XStack>
            </YStack>

            {error !== '' && (
              <XStack
                backgroundColor="#FFF5F7"
                borderRadius="$3"
                paddingHorizontal="$3"
                paddingVertical="$2"
                borderLeftWidth={3}
                borderLeftColor="#BC002D"
              >
                <Text color="#BC002D" fontSize="$2">
                  {error}
                </Text>
              </XStack>
            )}

            <Button
              size="$4"
              borderRadius="$4"
              fontWeight="700"
              backgroundColor="#BC002D"
              color="white"
              pressStyle={{ opacity: 0.8 }}
              onPress={handleSignup}
              disabled={isDisabled}
              opacity={isDisabled ? 0.5 : 1}
              icon={loading ? <Spinner color="white" /> : undefined}
            >
              {loading ? '' : '登録する'}
            </Button>

            <XStack alignItems="center" gap="$3">
              <Separator flex={1} borderColor="#FFD0DC" />
              <Text fontSize="$2" color="#aaa">または</Text>
              <Separator flex={1} borderColor="#FFD0DC" />
            </XStack>

            <Button
              size="$4"
              borderRadius="$4"
              variant="outlined"
              borderColor="#FFD0DC"
              color="#aaa"
              disabled
              opacity={0.4}
            >
              Google で登録（準備中）
            </Button>
          </YStack>

          {/* ログインリンク */}
          <XStack justifyContent="center" gap="$2">
            <Text color="#888" fontSize="$3">
              すでにアカウントをお持ちですか？
            </Text>
            <Text
              color="#BC002D"
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
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
});
