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
import { getOAuthRedirectUrl, supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  async function handleGoogleLogin() {
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getOAuthRedirectUrl({ mode: 'login' }),
        skipBrowserRedirect: false,
      },
    });

    if (signInError) {
      setLoading(false);
      setError('Google ログインを開始できませんでした');
    }
  }

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

          {/* ログインカード */}
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
                borderColor="#FFD0DC"
                focusStyle={{ borderColor: '#BC002D' }}
              />
              <XStack alignItems="center">
                <Input
                  flex={1}
                  placeholder="パスワード"
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
              onPress={handleLogin}
              disabled={loading || email === '' || password === ''}
              opacity={loading || email === '' || password === '' ? 0.5 : 1}
              icon={loading ? <Spinner color="white" /> : undefined}
            >
              {loading ? '' : 'ログイン'}
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
              color="#BC002D"
              backgroundColor="white"
              pressStyle={{ opacity: 0.8 }}
              onPress={handleGoogleLogin}
              disabled={loading}
              opacity={loading ? 0.5 : 1}
            >
              Google でログイン
            </Button>
          </YStack>

          {/* 新規登録リンク */}
          <XStack justifyContent="center" gap="$2">
            <Text color="#888" fontSize="$3">
              アカウントをお持ちでないですか？
            </Text>
            <Text
              color="#BC002D"
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
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },
});
