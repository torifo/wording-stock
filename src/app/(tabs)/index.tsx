import { useEffect, useCallback } from 'react';
import { FlatList, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Button, Text, YStack, XStack, Input, ScrollView, Spinner } from 'tamagui';
import { useState } from 'react';
import { ExpressionCard } from '../../components/ExpressionCard';
import { DailySection } from '../../components/DailySection';
import { MaxWidth } from '../../components/MaxWidth';
import { useTimeline } from '../../hooks/useTimeline';
import { useFavorites } from '../../hooks/useFavorites';
import { useAuth } from '../../context/AuthContext';
import type { Category } from '../../types';

const CATEGORIES: Array<Category | null> = [null, '四字熟語', '慣用句', 'ことわざ', '名言・格言', '詩・俳句', 'その他'];

export default function TimelineScreen() {
  const { user, session, loading: authLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { expressions, loading, loadingMore, error, fetch, fetchMore } = useTimeline({
    category: selectedCategory,
    keyword,
  });

  const { favoriteIds, fetchIds, toggle } = useFavorites(user?.id);

  useEffect(() => {
    if (session) {
      fetch();
      fetchIds();
    }
  }, [fetch, fetchIds, session]);

  const handleBookmarkToggle = useCallback(async (id: string) => {
    await toggle(id);
  }, [toggle]);

  function handleSearch() {
    setKeyword(searchInput);
  }

  if (authLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  if (!session) {
    return <Redirect href="/auth/login" />;
  }

  const expressionsWithFav = expressions.map((e) => ({
    ...e,
    isFavorited: favoriteIds.has(e.id),
  }));

  return (
    <YStack flex={1} backgroundColor="$background">
      <MaxWidth>
        {/* 検索バー */}
        <XStack
          padding="$2"
          gap="$2"
          backgroundColor="$background"
          zIndex={10}
        >
          <Input
            flex={1}
            placeholder="キーワード検索..."
            value={searchInput}
            onChangeText={setSearchInput}
            onSubmitEditing={handleSearch}
          />
          <Button size="$3" onPress={handleSearch} backgroundColor="#BC002D" color="white">
            検索
          </Button>
        </XStack>

        {/* カテゴリフィルター */}
        <XStack
          backgroundColor="$background"
          zIndex={10}
          paddingBottom="$1"
          borderBottomWidth={1}
          borderBottomColor="$borderColor"
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 4, gap: 6 }}
          >
            {CATEGORIES.map((cat) => (
              <Button
                key={cat ?? 'all'}
                size="$2"
                marginRight="$1"
                variant={selectedCategory === cat ? undefined : 'outlined'}
                backgroundColor={selectedCategory === cat ? '#BC002D' : undefined}
                color={selectedCategory === cat ? 'white' : '#BC002D'}
                borderColor="#BC002D"
                onPress={() => setSelectedCategory(cat)}
              >
                {cat ?? 'すべて'}
              </Button>
            ))}
          </ScrollView>
        </XStack>

        {/* 投稿ボタン */}
        {user && (
          <XStack justifyContent="flex-end" paddingHorizontal="$3" paddingVertical="$1" backgroundColor="$background">
            <Button
              size="$3"
              backgroundColor="#BC002D"
              color="white"
              pressStyle={{ backgroundColor: '$red10' }}
              onPress={() => router.push('/post')}
            >
              ＋ 投稿する
            </Button>
          </XStack>
        )}

        {/* タイムライン */}
        {loading ? (
          <YStack flex={1} alignItems="center" justifyContent="center">
            <ActivityIndicator color="#BC002D" />
          </YStack>
        ) : error !== '' ? (
          <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
            <Text color="$red10">{error}</Text>
          </YStack>
        ) : (
          <FlatList
            data={expressionsWithFav}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExpressionCard
                expression={item}
                onBookmarkToggle={handleBookmarkToggle}
              />
            )}
            contentContainerStyle={{ padding: 12 }}
            onEndReached={fetchMore}
            onEndReachedThreshold={0.5}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={fetch} tintColor="#BC002D" />
            }
            ListHeaderComponent={<DailySection />}
            ListEmptyComponent={
              <YStack alignItems="center" padding="$6">
                <Text color="$gray10">該当する表現が見つかりませんでした</Text>
              </YStack>
            }
            ListFooterComponent={
              loadingMore ? <ActivityIndicator style={{ padding: 16 }} color="#BC002D" /> : null
            }
          />
        )}
      </MaxWidth>
    </YStack>
  );
}
