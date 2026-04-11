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
  const [showProfile, setShowProfile] = useState(false);

  if (expression.censor_status === 'banned') return null;

  const { profile } = expression;
  const hasMeaning = !!expression.meaning;
  const hasFavoriteExpr = !!profile?.favorite_expression;

  function handleBookmark() {
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
    >
      {/* ヘッダー */}
      <XStack gap="$2" alignItems="center" marginBottom="$2">
        <Button
          chromeless
          padding={0}
          onPress={() => hasFavoriteExpr && setShowProfile((v) => !v)}
        >
          <Avatar circular size="$3">
            {profile?.avatar_url ? (
              <Avatar.Image src={profile.avatar_url} />
            ) : (
              <Avatar.Fallback backgroundColor="#fde8ed">
                <Text fontSize="$3" color="#BC002D">
                  {profile?.username?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </Avatar.Fallback>
            )}
          </Avatar>
        </Button>

        <YStack flex={1}>
          <Button
            chromeless
            padding={0}
            alignSelf="flex-start"
            onPress={() => hasFavoriteExpr && setShowProfile((v) => !v)}
          >
            <XStack alignItems="center" gap="$1">
              <Text fontWeight="bold" fontSize="$3" color="#222">
                {profile?.username ?? '匿名'}
              </Text>
              {hasFavoriteExpr && (
                <Ionicons
                  name={showProfile ? 'chevron-up-outline' : 'chevron-down-outline'}
                  size={12}
                  color="#BC002D"
                />
              )}
            </XStack>
          </Button>
          <XStack gap="$2">
            <Text fontSize="$2" color="#888">{expression.category}</Text>
            <Text fontSize="$2" color="#888">{formatDate(expression.created_at)}</Text>
          </XStack>
        </YStack>

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

      {/* 推し表現パネル */}
      {showProfile && profile?.favorite_expression && (
        <XStack
          backgroundColor="#FFF5F7"
          borderRadius="$2"
          padding="$2"
          marginBottom="$2"
          gap="$1"
          alignItems="flex-start"
        >
          <Ionicons name="heart-outline" size={12} color="#BC002D" style={{ marginTop: 2 }} />
          <YStack flex={1}>
            <Text fontSize="$1" color="#BC002D" fontWeight="700">推しの表現</Text>
            <Text fontSize="$2" color="#444">{profile.favorite_expression}</Text>
          </YStack>
        </XStack>
      )}

      {/* 言葉・表現 */}
      {expression.censor_status === 'grey' ? (
        <GreyLayer content={expression.content} />
      ) : (
        <Text fontSize="$6" fontWeight="700" marginBottom="$2" letterSpacing={-0.3} color="#111">
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
              backgroundColor="#fff5f7"
              borderRadius="$3"
              padding="$3"
              marginTop="$2"
              borderLeftWidth={3}
              borderLeftColor="#BC002D"
            >
              <Text fontSize="$3" color="#333" lineHeight={22}>
                {expression.meaning}
              </Text>
              {expression.source_name && (
                <Text fontSize="$1" color="#999" marginTop="$2">
                  出典: {expression.source_name}
                </Text>
              )}
            </YStack>
          )}
        </YStack>
      )}

      {/* いいねボタン */}
      <VoteButtons
        expressionId={expression.id}
        appropriateCount={expression.appropriate_count ?? 0}
        iLiked={expression.iLiked}
      />
    </Card>
  );
}
