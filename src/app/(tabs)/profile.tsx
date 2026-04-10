import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Redirect } from 'expo-router';
import { Button, Input, Text, YStack, XStack, Avatar, Spinner } from 'tamagui';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Profile } from '../../types';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [favoriteExpression, setFavoriteExpression] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    if (data) {
      setProfile(data as Profile);
      setUsername(data.username ?? '');
      setFavoriteExpression(data.favorite_expression ?? '');
    }
  }

  async function handleSave() {
    if (!user) return;
    setError('');

    if (username.length < 1 || username.length > 20) {
      setError('ユーザー名は 1〜20 文字で入力してください');
      return;
    }
    if (favoriteExpression !== '' && favoriteExpression.length > 30) {
      setError('推しの表現は 30 文字以内で入力してください');
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username,
        favorite_expression: favoriteExpression || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    setSaving(false);

    if (updateError) {
      if (updateError.code === '23505') {
        setError('このユーザー名は既に使用されています');
      } else {
        setError(updateError.message);
      }
      return;
    }

    Alert.alert('保存しました');
    loadProfile();
  }

  async function handleAvatarPick() {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;

    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

    await supabase
      .from('profiles')
      .update({ avatar_url: urlData.publicUrl })
      .eq('id', user.id);

    loadProfile();
  }

  if (!user) {
    return <Redirect href="/auth/login" />;
  }

  if (loading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner />
      </YStack>
    );
  }

  return (
    <YStack flex={1} padding="$4" gap="$4">
      {/* アバター */}
      <YStack alignItems="center" gap="$2">
        <Avatar circular size="$8" onPress={handleAvatarPick}>
          {profile?.avatar_url ? (
            <Avatar.Image src={profile.avatar_url} />
          ) : (
            <Avatar.Fallback backgroundColor="$blue5">
              <Text fontSize="$6" color="$blue11">
                {username?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </Avatar.Fallback>
          )}
        </Avatar>
        <Text fontSize="$2" color="$blue10" onPress={handleAvatarPick}>
          画像を変更
        </Text>
      </YStack>

      {/* ユーザー名 */}
      <YStack gap="$1">
        <Text fontSize="$3" color="$gray10">ユーザー名（1〜20文字）</Text>
        <Input
          value={username}
          onChangeText={setUsername}
          placeholder="ユーザー名"
          maxLength={20}
        />
      </YStack>

      {/* 推しの表現 */}
      <YStack gap="$1">
        <Text fontSize="$3" color="$gray10">推しの表現（30文字以内）</Text>
        <Input
          value={favoriteExpression}
          onChangeText={setFavoriteExpression}
          placeholder="例: 温故知新、袖振り合うも多生の縁、など"
          maxLength={30}
        />
      </YStack>

      {error !== '' && (
        <Text color="$red10" fontSize="$3">
          {error}
        </Text>
      )}

      <Button
        backgroundColor="$blue9"
        color="white"
        pressStyle={{ backgroundColor: '$blue10' }}
        onPress={handleSave}
        disabled={saving}
        icon={saving ? <Spinner color="white" /> : undefined}
      >
        保存する
      </Button>

      <Button
        variant="outlined"
        borderColor="$blue9"
        color="$blue9"
        onPress={signOut}
        marginTop="$2"
      >
        ログアウト
      </Button>
    </YStack>
  );
}
