import { useEffect, useState } from 'react';
import { FlatList, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Text, YStack, XStack, Avatar, Card, Button } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import type { Profile, Expression, Category } from '../../types';

interface UserPost {
  id: string;
  content: string;
  meaning: string | null;
  source_name: string | null;
  category: Category;
  created_at: string;
  appropriate_count: number;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts]     = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [profileRes, postsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase
          .from('expressions')
          .select('id, content, meaning, source_name, category, created_at, appropriate_count')
          .eq('user_id', id)
          .eq('visibility', true)
          .in('censor_status', ['safe', 'grey'])
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      setLoading(false);
      if (profileRes.error) { setError(profileRes.error.message); return; }
      setProfile(profileRes.data as Profile);
      setPosts((postsRes.data ?? []) as UserPost[]);
    })();
  }, [id]);

  const header = (
    <XStack
      height={56}
      paddingHorizontal={16}
      alignItems="center"
      backgroundColor="white"
      borderBottomWidth={1}
      borderBottomColor="#FFD0DC"
      gap="$3"
    >
      <Button chromeless padding={0} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={22} color="#BC002D" />
      </Button>
      <Text fontSize={18} fontWeight="800" color="#BC002D" letterSpacing={-0.5}>
        Wording Stock
      </Text>
    </XStack>
  );

  const profileSection = profile ? (
    <YStack
      backgroundColor="white"
      padding="$4"
      gap="$2"
      borderBottomWidth={1}
      borderBottomColor="#FFD0DC"
      alignItems="center"
    >
      <Avatar circular size="$10">
        {profile.avatar_url ? (
          <Avatar.Image src={profile.avatar_url} />
        ) : (
          <Avatar.Fallback backgroundColor="#fde8ed">
            <Text fontSize="$7" color="#BC002D">
              {profile.username?.[0]?.toUpperCase() ?? '?'}
            </Text>
          </Avatar.Fallback>
        )}
      </Avatar>

      <Text fontSize="$5" fontWeight="800" color="#111" marginTop="$1">
        {profile.username ?? '匿名'}
      </Text>

      {profile.favorite_expression && (
        <XStack
          backgroundColor="#FFF5F7"
          borderRadius="$3"
          padding="$3"
          gap="$2"
          alignItems="flex-start"
          alignSelf="stretch"
          marginTop="$1"
        >
          <Ionicons name="heart" size={14} color="#BC002D" style={{ marginTop: 2 }} />
          <YStack flex={1}>
            <Text fontSize="$2" color="#BC002D" fontWeight="700">推しの表現</Text>
            <Text fontSize="$3" color="#333" marginTop="$1">{profile.favorite_expression}</Text>
          </YStack>
        </XStack>
      )}

      <Text fontSize="$2" color="#aaa" marginTop="$1">
        投稿 {posts.length} 件
      </Text>
    </YStack>
  ) : null;

  const content = (
    <YStack flex={1} backgroundColor="#FFE8EE">
      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator color="#BC002D" size="large" />
        </YStack>
      ) : error !== '' ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Text color="#BC002D">{error}</Text>
        </YStack>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={profileSection}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Card
              marginHorizontal={12}
              marginTop={12}
              backgroundColor="white"
              borderWidth={1}
              borderColor="#BC002D"
              borderRadius="$3"
              padding="$3"
            >
              <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$1">
                <Text fontSize="$4" fontWeight="700" color="#111" flex={1}>
                  {item.content}
                </Text>
                <XStack gap="$2" alignItems="center" marginLeft="$2">
                  <Ionicons name="heart" size={13} color="#BC002D" />
                  <Text fontSize="$2" color="#BC002D" fontWeight="600">
                    {item.appropriate_count ?? 0}
                  </Text>
                </XStack>
              </XStack>

              <XStack gap="$2" marginBottom={item.meaning ? '$2' : 0}>
                <Text fontSize="$2" color="#888">{item.category}</Text>
                <Text fontSize="$2" color="#888">{formatDate(item.created_at)}</Text>
              </XStack>

              {item.meaning && (
                <Text fontSize="$2" color="#555" numberOfLines={3}>{item.meaning}</Text>
              )}
              {item.source_name && (
                <Text fontSize="$1" color="#aaa" marginTop="$1">出典: {item.source_name}</Text>
              )}
            </Card>
          )}
          ListEmptyComponent={
            <YStack alignItems="center" padding="$8">
              <Ionicons name="document-text-outline" size={40} color="#ccc" />
              <Text color="#aaa" marginTop="$2">まだ投稿がありません</Text>
            </YStack>
          }
        />
      )}
    </YStack>
  );

  if (isWide) {
    return (
      <YStack flex={1} backgroundColor="#FFF5F7">
        {header}
        <YStack flex={1} padding={16} alignItems="center">
          <YStack flex={1} width="100%" maxWidth={720} backgroundColor="white" borderRadius={12} overflow="hidden">
            {content}
          </YStack>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="#FFF5F7">
      {header}
      {content}
    </YStack>
  );
}
