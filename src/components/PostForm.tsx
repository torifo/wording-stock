import { useState } from 'react';
import { Button, Input, Text, TextArea, YStack, XStack, Select, Spinner } from 'tamagui';
import { usePost } from '../hooks/usePost';
import { useAuth } from '../context/AuthContext';
import type { Category } from '../types';

const CATEGORIES: Category[] = ['四字熟語', '慣用句', 'ことわざ', '詩・俳句', '名言・格言', 'その他'];
const MAX_LENGTH = 280;

interface Props {
  onSuccess?: () => void;
}

export function PostForm({ onSuccess }: Props) {
  const { user } = useAuth();
  const { posting, error, warning, post, clearMessages } = usePost();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Category>('四字熟語');

  const isOverLimit = content.length > MAX_LENGTH;
  const isEmpty = content.trim().length === 0;
  const canPost = !isEmpty && !isOverLimit && !posting;

  async function handlePost() {
    if (!user || !canPost) return;
    const success = await post({ content, category, userId: user.id });
    if (success) {
      setContent('');
      clearMessages();
      onSuccess?.();
    }
  }

  return (
    <YStack gap="$3" padding="$4">
      <TextArea
        placeholder="日本語の豊かな表現を投稿しよう..."
        value={content}
        onChangeText={(v) => { clearMessages(); setContent(v); }}
        minHeight={120}
      />

      {/* 文字数カウンター */}
      <XStack justifyContent="flex-end">
        <Text
          fontSize="$2"
          color={isOverLimit ? '$red10' : '$gray10'}
        >
          {content.length} / {MAX_LENGTH}
        </Text>
      </XStack>

      {isOverLimit && (
        <Text color="$red10" fontSize="$3">
          280 文字以内で入力してください
        </Text>
      )}

      {/* カテゴリ選択 */}
      <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
        <Select.Trigger>
          <Select.Value placeholder="カテゴリを選択" />
        </Select.Trigger>
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

      {warning !== '' && (
        <Text color="$orange10" fontSize="$3">
          {warning}
        </Text>
      )}

      {error !== '' && (
        <Text color="$red10" fontSize="$3">
          {error}
        </Text>
      )}

      <Button
        onPress={handlePost}
        disabled={!canPost}
        icon={posting ? <Spinner /> : undefined}
      >
        投稿する
      </Button>
    </YStack>
  );
}
