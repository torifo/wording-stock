import { useState } from 'react';
import { Button, Text, TextArea, Input, YStack, XStack, Select, Spinner } from 'tamagui';
import { usePost } from '../hooks/usePost';
import { useAuth } from '../context/AuthContext';
import type { Category } from '../types';

const CATEGORIES: Category[] = ['四字熟語', '慣用句', 'ことわざ', '詩・俳句', '名言・格言', 'その他'];
const CONTENT_MAX = 50;   // 言葉・表現（短め）
const MEANING_MAX  = 500; // 意味・説明

interface Props {
  onSuccess?: () => void;
}

export function PostForm({ onSuccess }: Props) {
  const { user } = useAuth();
  const { posting, error, warning, post, clearMessages } = usePost();
  const [content, setContent]     = useState('');
  const [meaning, setMeaning]     = useState('');
  const [sourceName, setSourceName] = useState('');
  const [category, setCategory]   = useState<Category>('四字熟語');

  const contentOver = content.length > CONTENT_MAX;
  const meaningOver = meaning.length > MEANING_MAX;
  const canPost = content.trim().length > 0 && !contentOver && !meaningOver && !posting;

  async function handlePost() {
    if (!user || !canPost) return;
    const success = await post({ content, meaning, sourceName, category, userId: user.id });
    if (success) {
      setContent('');
      setMeaning('');
      setSourceName('');
      clearMessages();
      onSuccess?.();
    }
  }

  return (
    <YStack gap="$3" padding="$4">

      {/* 言葉・表現 */}
      <YStack gap="$1">
        <Text fontSize="$3" fontWeight="600" color="$color11">
          言葉・表現
        </Text>
        <TextArea
          placeholder="四字熟語・慣用句・ことわざなど..."
          value={content}
          onChangeText={(v) => { clearMessages(); setContent(v); }}
          minHeight={70}
          maxHeight={120}
        />
        <XStack justifyContent="flex-end">
          <Text fontSize="$1" color={contentOver ? '$red10' : '$color8'}>
            {content.length} / {CONTENT_MAX}
          </Text>
        </XStack>
        {contentOver && (
          <Text color="$red10" fontSize="$2">{CONTENT_MAX}文字以内で入力してください</Text>
        )}
      </YStack>

      {/* 意味・思い・ニュアンス */}
      <YStack gap="$1">
        <Text fontSize="$3" fontWeight="600" color="$color11">
          意味・思い・ニュアンス
          <Text fontSize="$2" fontWeight="400" color="$color8"> （任意）</Text>
        </Text>
        <TextArea
          placeholder="意味や使い方、込めた思い、言葉のニュアンスなどを書いてみよう..."
          value={meaning}
          onChangeText={(v) => { clearMessages(); setMeaning(v); }}
          minHeight={90}
          maxHeight={160}
        />
        <XStack justifyContent="flex-end">
          <Text fontSize="$1" color={meaningOver ? '$red10' : '$color8'}>
            {meaning.length} / {MEANING_MAX}
          </Text>
        </XStack>
      </YStack>

      {/* 出典・引用元 */}
      <YStack gap="$1">
        <Text fontSize="$3" fontWeight="600" color="$color11">
          出典・引用元
          <Text fontSize="$2" fontWeight="400" color="$color8"> （任意）</Text>
        </Text>
        <Input
          placeholder="例: 論語、夏目漱石「こころ」、など"
          value={sourceName}
          onChangeText={(v) => { clearMessages(); setSourceName(v); }}
          maxLength={100}
        />
      </YStack>

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
        <Text color="$orange10" fontSize="$3">{warning}</Text>
      )}
      {error !== '' && (
        <Text color="$red10" fontSize="$3">{error}</Text>
      )}

      <Button
        onPress={handlePost}
        disabled={!canPost}
        icon={posting ? <Spinner color="white" /> : undefined}
        backgroundColor="#BC002D"
        color="white"
        borderRadius="$4"
        fontWeight="700"
        pressStyle={{ opacity: 0.8 }}
        opacity={canPost ? 1 : 0.5}
      >
        {posting ? '' : '投稿する'}
      </Button>
    </YStack>
  );
}
