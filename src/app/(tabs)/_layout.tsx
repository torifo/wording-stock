import { Tabs, Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Spinner, YStack } from 'tamagui';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'タイムライン',
          headerShown: true,
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'プロフィール',
          headerShown: true,
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
