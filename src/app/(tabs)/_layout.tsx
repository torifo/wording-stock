import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Spinner, YStack } from 'tamagui';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const { session, loading } = useAuth();

  // 認証ロード中はスピナー表示
  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner />
      </YStack>
    );
  }

  // 未認証ならログイン画面へリダイレクト
  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'タイムライン',
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'プロフィール',
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
