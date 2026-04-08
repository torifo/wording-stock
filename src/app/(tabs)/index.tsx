import { useEffect, useCallback } from 'react';
import { FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Button, Text, YStack, XStack, Input, ScrollView } from 'tamagui';
import { useState } from 'react';
import { ExpressionCard } from '../../components/ExpressionCard';
import { useTimeline } from '../../hooks/useTimeline';
import { useAuth } from '../../context/AuthContext';
import type { Category } from '../../types';

const CATEGORIES: Array<Category | null> = [null, '四字熟語', '慣用句', 'ことわざ', '詩・俳句', 'その他'];

export default function TimelineScreen() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { expressions, loading, loadingMore, error, fetch, fetchMore } = useTimeline({
    category: selectedCategory,
    keyword,
  });

  useEffect(() => {
    fetch();
  }, [fetch]);

  function handleSearch() {
    setKeyword(searchInput);
  }

  return (
    <YStack flex={1}>
      {/* 検索バー */}
      <XStack padding="$2" gap="$2">
        <Input
          flex={1}
          placeholder="キーワード検索..."
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={handleSearch}
        />
        <Button size="$3" onPress={handleSearch}>
          検索
        </Button>
      </XStack>

      {/* カテゴリフィルター */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} paddingHorizontal="$2">
        <XStack gap="$2" paddingVertical="$1">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat ?? 'all'}
              size="$2"
              variant={selectedCategory === cat ? undefined : 'outlined'}
              onPress={() => setSelectedCategory(cat)}
            >
              {cat ?? 'すべて'}
            </Button>
          ))}
        </XStack>
      </ScrollView>

      {/* 投稿ボタン */}
      {user && (
        <XStack justifyContent="flex-end" paddingHorizontal="$3" paddingVertical="$1">
          <Button size="$3" onPress={() => router.push('/post')}>
            ＋ 投稿する
          </Button>
        </XStack>
      )}

      {/* タイムライン */}
      {loading ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <ActivityIndicator />
        </YStack>
      ) : error !== '' ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$4">
          <Text color="$red10">{error}</Text>
        </YStack>
      ) : (
        <FlatList
          data={expressions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ExpressionCard expression={item} />}
          contentContainerStyle={{ padding: 12 }}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetch} />
          }
          ListEmptyComponent={
            <YStack alignItems="center" padding="$6">
              <Text color="$gray10">該当する表現が見つかりませんでした</Text>
            </YStack>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ padding: 16 }} /> : null
          }
        />
      )}
    </YStack>
  );
}
