import { useState, useEffect } from 'react';
import { Alert, FlatList, ActivityIndicator, Platform, useWindowDimensions, View } from 'react-native';
import { Redirect } from 'expo-router';
import { Button, Input, Text, YStack, XStack, Avatar, Spinner, TextArea, Select, Card } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useMyPosts } from '../../hooks/useMyPosts';
import { useFavorites } from '../../hooks/useFavorites';
import { ExpressionCard } from '../../components/ExpressionCard';
import type { Profile, Category, Expression } from '../../types';

type Tab = 'settings' | 'posts' | 'favorites';

const CATEGORIES: Category[] = ['四字熟語', '慣用句', 'ことわざ', '名言・格言', '詩・俳句', 'その他'];

// ── 投稿履歴カード（編集・削除付き） ──────────────────────────────────────

function MyPostCard({
  post,
  onDeleted,
  onUpdated,
}: {
  post: Expression;
  onDeleted: (id: string) => Promise<string | null>;
  onUpdated: (id: string, fields: { content: string; meaning: string; category: Category }) => Promise<string | null>;
}) {
  const [editing, setEditing]   = useState(false);
  const [content, setContent]   = useState(post.content);
  const [meaning, setMeaning]   = useState(post.meaning ?? '');
  const [category, setCategory] = useState<Category>(post.category);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errMsg, setErrMsg]     = useState('');

  function formatDate(iso: string) {
    const d = new Date(iso);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
  }

  async function performDelete() {
    setDeleting(true);
    const err = await onDeleted(post.id);
    setDeleting(false);
    if (err) setErrMsg(err);
  }

  function handleDeleteConfirm() {
    if (Platform.OS === 'web') {
      // Web では window.confirm を直接使用（Alert.alert の web 実装に依存しない）
      if ((globalThis as any).confirm?.('この投稿を削除しますか？') === false) return;
      performDelete();
    } else {
      Alert.alert('削除の確認', 'この投稿を削除しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: '削除', style: 'destructive', onPress: performDelete },
      ]);
    }
  }

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    setErrMsg('');
    const err = await onUpdated(post.id, { content: content.trim(), meaning, category });
    setSaving(false);
    if (err) { setErrMsg(err); return; }
    setEditing(false);
  }

  return (
    <Card
      marginBottom="$2"
      backgroundColor="white"
      borderWidth={1}
      borderColor="#BC002D"
      borderRadius="$3"
      padding="$3"
    >
      {!editing ? (
        <>
          <XStack justifyContent="space-between" alignItems="flex-start" marginBottom="$1">
            <YStack flex={1}>
              <Text fontSize="$5" fontWeight="700" color="#111">{post.content}</Text>
              <XStack gap="$2" marginTop="$1">
                <Text fontSize="$2" color="#888">{post.category}</Text>
                <Text fontSize="$2" color="#888">{formatDate(post.created_at)}</Text>
              </XStack>
            </YStack>
            <XStack gap="$2" alignItems="center">
              <Button size="$2" chromeless onPress={() => setEditing(true)} paddingHorizontal="$1">
                <Ionicons name="pencil-outline" size={16} color="#BC002D" />
              </Button>
              <Button size="$2" chromeless onPress={handleDeleteConfirm} paddingHorizontal="$1" disabled={deleting}>
                {deleting
                  ? <Spinner size="small" color="#BC002D" />
                  : <Ionicons name="trash-outline" size={16} color="#BC002D" />}
              </Button>
            </XStack>
          </XStack>

          {post.meaning && (
            <Text fontSize="$2" color="#555" numberOfLines={2} marginBottom="$2">
              {post.meaning}
            </Text>
          )}

          {/* いいね数（統計表示・ボタンなし） */}
          <XStack alignItems="center" gap="$1">
            <Ionicons name="heart" size={13} color="#BC002D" />
            <Text fontSize="$2" color="#BC002D" fontWeight="600">
              {post.appropriate_count ?? 0}
            </Text>
            <Text fontSize="$2" color="#aaa"> いいね</Text>
          </XStack>

          {errMsg !== '' && (
            <Text color="#BC002D" fontSize="$2" marginTop="$1">{errMsg}</Text>
          )}
        </>
      ) : (
        <YStack gap="$2">
          <Text fontSize="$2" fontWeight="700" color="#333">編集</Text>
          <Input value={content} onChangeText={setContent} placeholder="言葉・表現"
            borderColor="#FFD0DC" focusStyle={{ borderColor: '#BC002D' }} />
          <TextArea value={meaning} onChangeText={setMeaning} placeholder="意味・思い・ニュアンス（任意）"
            minHeight={80} borderColor="#FFD0DC" focusStyle={{ borderColor: '#BC002D' }} />
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.ScrollUpButton />
              <Select.Viewport>
                {CATEGORIES.map((cat, i) => (
                  <Select.Item key={cat} index={i} value={cat}>
                    <Select.ItemText>{cat}</Select.ItemText>
                  </Select.Item>
                ))}
              </Select.Viewport>
              <Select.ScrollDownButton />
            </Select.Content>
          </Select>
          {errMsg !== '' && <Text color="#BC002D" fontSize="$2">{errMsg}</Text>}
          <XStack gap="$2" justifyContent="flex-end">
            <Button size="$2" variant="outlined" borderColor="#BC002D" color="#BC002D"
              onPress={() => { setEditing(false); setErrMsg(''); }}>
              キャンセル
            </Button>
            <Button size="$2" backgroundColor="#BC002D" color="white" onPress={handleSave}
              disabled={saving} icon={saving ? <Spinner color="white" size="small" /> : undefined}>
              保存
            </Button>
          </XStack>
        </YStack>
      )}
    </Card>
  );
}

// ── メイン ────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= 768;
  const [activeTab, setActiveTab] = useState<Tab>('settings');

  // プロフィール設定
  const [profile, setProfile]                   = useState<Profile | null>(null);
  const [username, setUsername]                 = useState('');
  const [favoriteExpression, setFavoriteExpression] = useState('');
  const [loading, setLoading]                   = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [settingsError, setSettingsError]       = useState('');

  // 投稿履歴
  const { posts, loading: postsLoading, error: postsError, fetch: fetchPosts, deletePost, updatePost } = useMyPosts(user?.id);

  // お気に入り
  const { favorites, loading: favsLoading, error: favsError, fetch: fetchFavs, toggle } = useFavorites(user?.id);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'posts' && posts.length === 0) fetchPosts();
    if (activeTab === 'favorites' && favorites.length === 0) fetchFavs();
  }, [activeTab]);

  async function loadProfile() {
    if (!user) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setLoading(false);
    if (fetchError) { setSettingsError(fetchError.message); return; }
    if (data) {
      setProfile(data as Profile);
      setUsername(data.username ?? '');
      setFavoriteExpression(data.favorite_expression ?? '');
    }
  }

  async function handleSave() {
    if (!user) return;
    setSettingsError('');
    if (username.length < 1 || username.length > 20) { setSettingsError('ユーザー名は 1〜20 文字で入力してください'); return; }
    if (favoriteExpression !== '' && favoriteExpression.length > 30) { setSettingsError('推しの表現は 30 文字以内で入力してください'); return; }
    setSaving(true);
    const { error: updateError } = await supabase.from('profiles').update({ username, favorite_expression: favoriteExpression || null, updated_at: new Date().toISOString() }).eq('id', user.id);
    setSaving(false);
    if (updateError) {
      setSettingsError(updateError.code === '23505' ? 'このユーザー名は既に使用されています' : updateError.message);
      return;
    }
    Alert.alert('保存しました');
    loadProfile();
  }

  async function handleAvatarPick() {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { contentType: `image/${ext}`, upsert: true });
    if (uploadError) { setSettingsError(uploadError.message); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
    loadProfile();
  }

  if (!user) return <Redirect href="/auth/login" />;
  if (loading) return <YStack flex={1} alignItems="center" justifyContent="center"><Spinner /></YStack>;

  const tabStyle = (tab: Tab) => ({
    flex: 1 as const,
    size: '$3' as const,
    backgroundColor: activeTab === tab ? '#BC002D' : 'transparent',
    color: activeTab === tab ? 'white' : '#BC002D',
    borderColor: '#BC002D' as const,
    borderBottomWidth: activeTab === tab ? 0 : 1,
    borderRadius: 0 as const,
    onPress: () => setActiveTab(tab),
  } as const);

  // ── プロフィールコンテンツ（タブ含む） ──────────────────────────────────
  const profileContent = (
    <YStack flex={1}>
      {/* タブバー */}
      <XStack borderBottomWidth={1} borderBottomColor="#BC002D">
          <Button {...tabStyle('settings')}>設定</Button>
          <Button {...tabStyle('posts')}>投稿履歴</Button>
          <Button {...tabStyle('favorites')}>お気に入り</Button>
        </XStack>

        {/* ── 設定タブ ── */}
        {activeTab === 'settings' && (
          <FlatList
            data={[]}
            renderItem={null}
            keyExtractor={() => ''}
            contentContainerStyle={{ padding: 16, gap: 16 }}
            ListHeaderComponent={
              <YStack gap="$4">
                {/* アバター */}
                <YStack alignItems="center" gap="$2">
                  <Avatar circular size="$10" onPress={handleAvatarPick}>
                    {profile?.avatar_url ? (
                      <Avatar.Image src={profile.avatar_url} />
                    ) : (
                      <Avatar.Fallback backgroundColor="$red2">
                        <Text fontSize="$7" color="#BC002D">{username?.[0]?.toUpperCase() ?? '?'}</Text>
                      </Avatar.Fallback>
                    )}
                  </Avatar>
                  <Button size="$2" chromeless color="#BC002D" onPress={handleAvatarPick}>
                    <XStack alignItems="center" gap="$1">
                      <Ionicons name="camera-outline" size={14} color="#BC002D" />
                      <Text fontSize="$2" color="#BC002D">画像を変更</Text>
                    </XStack>
                  </Button>
                </YStack>

                {/* フォーム */}
                <YStack gap="$1">
                  <Text fontSize="$3" color="$gray10">ユーザー名（1〜20文字）</Text>
                  <Input value={username} onChangeText={setUsername} placeholder="ユーザー名" maxLength={20} />
                </YStack>
                <YStack gap="$1">
                  <Text fontSize="$3" color="$gray10">推しの表現（30文字以内）</Text>
                  <Input value={favoriteExpression} onChangeText={setFavoriteExpression} placeholder="例: 温故知新、袖振り合うも多生の縁、など" maxLength={30} />
                </YStack>

                {settingsError !== '' && <Text color="$red10" fontSize="$3">{settingsError}</Text>}

                <Button backgroundColor="#BC002D" color="white" pressStyle={{ opacity: 0.8 }} onPress={handleSave} disabled={saving} icon={saving ? <Spinner color="white" /> : undefined}>
                  保存する
                </Button>
                <Button variant="outlined" borderColor="#BC002D" color="#BC002D" onPress={signOut}>
                  ログアウト
                </Button>
              </YStack>
            }
          />
        )}

        {/* ── 投稿履歴タブ ── */}
        {activeTab === 'posts' && (
          postsLoading ? (
            <YStack flex={1} alignItems="center" justifyContent="center"><ActivityIndicator color="#BC002D" /></YStack>
          ) : postsError !== '' ? (
            <YStack flex={1} alignItems="center" justifyContent="center" padding="$4"><Text color="$red10">{postsError}</Text></YStack>
          ) : (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12 }}
              renderItem={({ item }) => (
                <MyPostCard
                  post={item}
                  onDeleted={deletePost}
                  onUpdated={updatePost}
                />
              )}
              ListEmptyComponent={
                <YStack alignItems="center" padding="$8">
                  <Ionicons name="document-text-outline" size={40} color="#ccc" />
                  <Text color="$gray9" marginTop="$2">まだ投稿がありません</Text>
                </YStack>
              }
            />
          )
        )}

        {/* ── お気に入りタブ ── */}
        {activeTab === 'favorites' && (
          favsLoading ? (
            <YStack flex={1} alignItems="center" justifyContent="center"><ActivityIndicator color="#BC002D" /></YStack>
          ) : favsError !== '' ? (
            <YStack flex={1} alignItems="center" justifyContent="center" padding="$4"><Text color="$red10">{favsError}</Text></YStack>
          ) : (
            <FlatList
              data={favorites}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12 }}
              renderItem={({ item }) => (
                <ExpressionCard
                  expression={{ ...item, isFavorited: true }}
                  onBookmarkToggle={async (id) => {
                    await toggle(id);
                  }}
                />
              )}
              ListEmptyComponent={
                <YStack alignItems="center" padding="$8">
                  <Ionicons name="bookmark-outline" size={40} color="#ccc" />
                  <Text color="$gray9" marginTop="$2">お気に入りがありません</Text>
                  <Text fontSize="$2" color="$gray8" marginTop="$1">タイムラインの🔖アイコンで追加できます</Text>
                </YStack>
              }
            />
          )
        )}
    </YStack>
  );

  // ── PC レイアウト ────────────────────────────────────────────────────────
  if (isWide) {
    return (
      <YStack flex={1} backgroundColor="#FFF5F7">
        {/* ヘッダー */}
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

        {/* コンテンツ：中央寄せカード */}
        <YStack flex={1} padding={16} alignItems="center">
          <YStack
            flex={1}
            width="100%"
            maxWidth={860}
            backgroundColor="white"
            borderRadius={12}
            overflow="hidden"
          >
            {profileContent}
          </YStack>
        </YStack>
      </YStack>
    );
  }

  // ── モバイル レイアウト ──────────────────────────────────────────────────
  return (
    <YStack flex={1} backgroundColor="$background">
      {profileContent}
    </YStack>
  );
}
