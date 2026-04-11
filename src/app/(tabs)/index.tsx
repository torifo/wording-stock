import { useEffect, useCallback, useState, useRef } from 'react';
import { FlatList, ActivityIndicator, RefreshControl, View, useWindowDimensions } from 'react-native';
import { router, Redirect } from 'expo-router';
import { Button, Text, YStack, XStack, Input, ScrollView, Spinner, Theme } from 'tamagui';
import { supabase } from '../../lib/supabase';
import { ExpressionCard } from '../../components/ExpressionCard';
import { DailySectionHorizontal, DailySectionVertical } from '../../components/DailySection';
import { useTimeline } from '../../hooks/useTimeline';
import { useFavorites } from '../../hooks/useFavorites';
import { useAuth } from '../../context/AuthContext';
import type { Category } from '../../types';

const CATEGORIES: Array<Category | null> = [null, '四字熟語', '慣用句', 'ことわざ', '名言・格言', '詩・俳句', 'その他'];

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 520;
const SIDEBAR_DEFAULT = 300;

export default function TimelineScreen() {
  const { user, session, loading: authLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const { expressions, loading, loadingMore, error, fetch, fetchMore } = useTimeline({
    category: selectedCategory,
    keyword,
  });
  const { favoriteIds, fetchIds, toggle } = useFavorites(user?.id);

  const fetchLikedIds = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('votes')
      .select('expression_id')
      .eq('user_id', user.id)
      .eq('vote_type', 'appropriate');
    setLikedIds(new Set((data ?? []).map((r: any) => r.expression_id)));
  }, [user]);

  useEffect(() => {
    if (session) { fetch(); fetchIds(); fetchLikedIds(); }
  }, [fetch, fetchIds, fetchLikedIds, session]);

  const handleBookmarkToggle = useCallback(async (id: string) => {
    await toggle(id);
  }, [toggle]);

  function handleSearch() { setKeyword(searchInput); }

  // ── ドラッグリサイズ (web only) ────────────────────────────────────────
  function startResize(e: any) {
    dragRef.current = { startX: e.clientX, startWidth: sidebarWidth };

    function onMove(ev: any) {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - ev.clientX;
      const next = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, dragRef.current.startWidth + delta));
      setSidebarWidth(next);
    }
    function onUp() {
      dragRef.current = null;
      // @ts-ignore
      document.removeEventListener('mousemove', onMove);
      // @ts-ignore
      document.removeEventListener('mouseup', onUp);
    }
    // @ts-ignore
    document.addEventListener('mousemove', onMove);
    // @ts-ignore
    document.addEventListener('mouseup', onUp);
  }

  if (authLoading) {
    return <YStack flex={1} alignItems="center" justifyContent="center"><Spinner size="large" /></YStack>;
  }
  if (!session) return <Redirect href="/auth/login" />;

  const expressionsWithMeta = expressions.map((e) => ({
    ...e,
    isFavorited: favoriteIds.has(e.id),
    iLiked: likedIds.has(e.id),
  }));

  // ── タイムライン本体 ─────────────────────────────────────────────────────

  const timelineContent = (
    <YStack flex={1}>
      {/* 検索バー */}
      <XStack padding="$2" gap="$2" backgroundColor="$background" zIndex={10}>
        <Input flex={1} placeholder="キーワード検索..." value={searchInput}
          onChangeText={setSearchInput} onSubmitEditing={handleSearch} />
        <Button size="$3" backgroundColor="#BC002D" color="white" onPress={handleSearch}>検索</Button>
      </XStack>

      {/* カテゴリフィルター */}
      <XStack backgroundColor="$background" zIndex={10} paddingBottom="$1"
        borderBottomWidth={1} borderBottomColor="$borderColor">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 4, gap: 6 }}>
          {CATEGORIES.map((cat) => (
            <Button
              key={cat ?? 'all'} size="$2" marginRight="$1"
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
          <Button size="$3" backgroundColor="#BC002D" color="white"
            pressStyle={{ opacity: 0.8 }} onPress={() => router.push('/post')}>
            ＋ 投稿する
          </Button>
        </XStack>
      )}

      {/* 投稿一覧 */}
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
          data={expressionsWithMeta}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ExpressionCard expression={item} onBookmarkToggle={handleBookmarkToggle} />
          )}
          contentContainerStyle={{ padding: 12 }}
          onEndReached={fetchMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetch} tintColor="#BC002D" />}
          ListHeaderComponent={isWide ? null : <DailySectionHorizontal />}
          ListEmptyComponent={
            <YStack alignItems="center" padding="$6">
              <Text color="$gray10">該当する表現が見つかりませんでした</Text>
            </YStack>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color="#BC002D" /> : null}
        />
      )}
    </YStack>
  );

  // ── PC / 広い画面: ヘッダー + サイドバーレイアウト ──────────────────────

  if (isWide) {
    return (
      <YStack flex={1} backgroundColor="#FFF5F7">
        {/* ── グローバルヘッダー ── */}
        <XStack
          height={56}
          paddingHorizontal={24}
          alignItems="center"
          backgroundColor="white"
          borderBottomWidth={1}
          borderBottomColor="#FFD0DC"
        >
          <Text fontSize={22} fontWeight="800" color="#BC002D" letterSpacing={-0.5}>
            Wording Stock
          </Text>
        </XStack>

        {/* ── コンテンツエリア（余白付き） ── */}
        <XStack flex={1} padding={16} gap={0}>
          {/* タイムライン（ダーク・角丸） */}
          <Theme name="dark">
            <YStack flex={1} backgroundColor="#1C1C1E" borderRadius={12}
              // @ts-ignore
              style={{ overflow: 'hidden' }}>
              {timelineContent}
            </YStack>
          </Theme>

          {/* ドラッグハンドル */}
          <View
            // @ts-ignore
            onMouseDown={startResize}
            style={{
              width: 12,
              cursor: 'col-resize',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <View style={{
              width: 3,
              flex: 1,
              marginVertical: 24,
              borderRadius: 2,
              backgroundColor: '#FFB0C4',
              opacity: 0.6,
            }} />
          </View>

          {/* 今日の表現サイドバー（ライト・角丸・スティッキー） */}
          <YStack
            width={sidebarWidth}
            backgroundColor="white"
            borderRadius={12}
            padding="$4"
            flexShrink={0}
            // @ts-ignore
            style={{
              position: 'sticky',
              top: 16,
              alignSelf: 'flex-start',
              maxHeight: 'calc(100vh - 88px)',
              overflowY: 'auto',
            }}
          >
            <DailySectionVertical />
          </YStack>
        </XStack>
      </YStack>
    );
  }

  // ── モバイル: 通常レイアウト ────────────────────────────────────────────

  return (
    <YStack flex={1} backgroundColor="$background">
      {timelineContent}
    </YStack>
  );
}
