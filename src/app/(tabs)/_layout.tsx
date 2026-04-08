import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

// auth guard は各スクリーン（index / profile）で実施
// レイアウトは常に <Tabs> を返す（Expo Router の要件）
export default function TabLayout() {
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
