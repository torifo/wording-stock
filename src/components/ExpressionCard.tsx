import { Image } from 'react-native';
import { Card, Text, XStack, YStack, Avatar } from 'tamagui';
import { GreyLayer } from './GreyLayer';
import { VoteButtons } from './VoteButtons';
import type { Expression } from '../types';

interface Props {
  expression: Expression;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function ExpressionCard({ expression }: Props) {
  // banned は非表示（親で除外されているはずだが念のため）
  if (expression.censor_status === 'banned') {
    return null;
  }

  const { profile } = expression;

  return (
    <Card bordered padding="$3" marginBottom="$2">
      {/* ヘッダー: アバター・ユーザー名・カテゴリ・日時 */}
      <XStack gap="$2" alignItems="center" marginBottom="$2">
        <Avatar circular size="$3">
          {profile?.avatar_url ? (
            <Avatar.Image src={profile.avatar_url} />
          ) : (
            <Avatar.Fallback backgroundColor="$blue5">
              <Text fontSize="$3" color="$blue11">
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
            <Text fontSize="$2" color="$gray9">
              {expression.category}
            </Text>
            <Text fontSize="$2" color="$gray9">
              {formatDate(expression.created_at)}
            </Text>
          </XStack>
        </YStack>
      </XStack>

      {/* 本文: grey の場合は GreyLayer を適用 */}
      {expression.censor_status === 'grey' ? (
        <GreyLayer content={expression.content} />
      ) : (
        <Text fontSize="$4" marginBottom="$2">
          {expression.content}
        </Text>
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
