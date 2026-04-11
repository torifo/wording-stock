import { useState } from 'react';
import { Card, Text, XStack, YStack, Avatar, Button } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { GreyLayer } from './GreyLayer';
import { VoteButtons } from './VoteButtons';
import type { Expression } from '../types';

interface Props {
  expression: Expression;
  onBookmarkToggle?: (id: string, newState: boolean) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function ExpressionCard({ expression, onBookmarkToggle }: Props) {
  const [showMeaning, setShowMeaning] = useState(false);
  const [isFav, setIsFav] = useState(expression.isFavorited ?? false);

  if (expression.censor_status === 'banned') return null;

  const { profile } = expression;
  const hasMeaning = !!expression.meaning;

  async function handleBookmark() {
    const next = !isFav;
    setIsFav(next);
    onBookmarkToggle?.(expression.id, next);
  }

  return (
    <Card
      marginBottom="$2"
      backgroundColor="white"
      borderWidth={1}
      borderColor="#BC002D"
      borderRadius="$3"
      padding="$3"
      shadowColor="rgba(188,0,45,0.08)"
      shadowOffset={{ width: 0, height: 1 }}
      shadowRadius={4}
    >
      {/* ヘッダー: アバター・ユーザー名・カテゴリ・日時 */}
      <XStack gap="$2" alignItems="center" marginBottom="$2">
        <Avatar circular size="$3">
          {profile?.avatar_url ? (
            <Avatar.Image src={profile.avatar_url} />
          ) : (
            <Avatar.Fallback backgroundColor="$red2">
              <Text fontSize="$3" color="#BC002D">
                {profile?.username?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </Avatar.Fallback>
          )}
        </Avatar>

        <YStack flex={1}>
          <Text fontWeight="bold" fontSize="$3">
            {profile?.username ?? '匿名'}
          </Text>
          <XStack gap="$2">
            <Text fontSize="$2" color="$gray9">{expression.category}</Text>
            <Text fontSize="$2" color="$gray9">{formatDate(expression.created_at)}</Text>
          </XStack>
        </YStack>

        {/* ブックマークボタン */}
        {onBookmarkToggle && (
          <Button size="$2" chromeless onPress={handleBookmark} paddingHorizontal="$1">
            <Ionicons
              name={isFav ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color="#BC002D"
            />
          </Button>
        )}
      </XStack>

      {/* 言葉・表現（メイン） */}
      {expression.censor_status === 'grey' ? (
        <GreyLayer content={expression.content} />
      ) : (
        <Text fontSize="$6" fontWeight="700" marginBottom="$2" letterSpacing={-0.3} color="$color12">
          {expression.content}
        </Text>
      )}

      {/* 意味トグル */}
      {hasMeaning && (
        <YStack marginBottom="$2">
          <Button
            size="$2"
            chromeless
            onPress={() => setShowMeaning(!showMeaning)}
            paddingHorizontal={0}
            alignSelf="flex-start"
            color="#BC002D"
          >
            <XStack alignItems="center" gap="$1">
              <Ionicons
                name={showMeaning ? 'chevron-up-outline' : 'book-outline'}
                size={14}
                color="#BC002D"
              />
              <Text fontSize="$2" color="#BC002D">
                {showMeaning ? '閉じる' : '意味を見る'}
              </Text>
            </XStack>
          </Button>

          {showMeaning && (
            <YStack
              backgroundColor="$red1"
              borderRadius="$3"
              padding="$3"
              marginTop="$2"
              borderLeftWidth={3}
              borderLeftColor="#BC002D"
            >
              <Text fontSize="$3" color="$color11" lineHeight={22}>
                {expression.meaning}
              </Text>
              {expression.source_name && (
                <Text fontSize="$1" color="$color8" marginTop="$2">
                  出典: {expression.source_name}
                </Text>
              )}
            </YStack>
          )}
        </YStack>
      )}

      {/* 投票ボタン */}
      <VoteButtons
        expressionId={expression.id}
        appropriateCount={expression.appropriate_count ?? 0}
        inappropriateCount={expression.inappropriate_count ?? 0}
      />
    </Card>
  );
}
