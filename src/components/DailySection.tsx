import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Card, Text, YStack, XStack, Spinner } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useDailyExpressions, type DailyExpression } from '../hooks/useDailyExpression';

const CATEGORY_COLOR: Record<string, string> = {
  '四字熟語': '#BC002D',
  'ことわざ':  '#1a6b3a',
  '慣用句':   '#1a4a8a',
};

function todayLabel(): string {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

function DailyCard({ item, vertical }: { item: DailyExpression; vertical?: boolean }) {
  const [showMeaning, setShowMeaning] = useState(false);
  const color = CATEGORY_COLOR[item.category] ?? '#BC002D';

  return (
    <Card
      backgroundColor="white"
      borderWidth={1}
      borderColor={color}
      borderRadius="$3"
      padding="$3"
      marginBottom={vertical ? '$2' : undefined}
      marginRight={vertical ? undefined : '$2'}
      width={vertical ? '100%' : 200}
      pressStyle={{ opacity: 0.85 }}
      onPress={() => item.meaning && setShowMeaning((v) => !v)}
    >
      <YStack gap="$1">
        {/* カテゴリラベル */}
        <Text fontSize="$1" fontWeight="700" letterSpacing={0.5} style={{ color }}>
          今日の{item.category}
        </Text>

        {/* 表現本文 */}
        <Text
          fontSize={vertical ? '$4' : '$5'}
          fontWeight="800"
          letterSpacing={-0.5}
          numberOfLines={2}
          color="#111"
        >
          {item.content}
        </Text>

        {/* 意味トグル */}
        {item.meaning && (
          !showMeaning ? (
            <XStack alignItems="center" gap="$1" marginTop="$1">
              <Ionicons name="book-outline" size={11} color="#999" />
              <Text fontSize="$1" color="#999">意味を見る</Text>
            </XStack>
          ) : (
            <YStack marginTop="$1" gap="$1">
              <Text fontSize="$2" color="#444" lineHeight={18} numberOfLines={vertical ? undefined : 3}>
                {item.meaning}
              </Text>
              {item.source_name && (
                <Text fontSize="$1" color="#aaa">出典: {item.source_name}</Text>
              )}
              <XStack alignItems="center" gap="$1">
                <Ionicons name="chevron-up-outline" size={11} color="#999" />
                <Text fontSize="$1" color="#999">閉じる</Text>
              </XStack>
            </YStack>
          )
        )}
      </YStack>
    </Card>
  );
}

/** モバイル用：横スクロール */
export function DailySectionHorizontal() {
  const { expressions, loading } = useDailyExpressions();

  return (
    <YStack paddingVertical="$2" borderBottomWidth={1} borderBottomColor="#eee">
      <XStack alignItems="center" gap="$2" paddingHorizontal="$3" marginBottom="$2">
        <Ionicons name="sunny-outline" size={14} color="#BC002D" />
        <Text fontSize="$2" fontWeight="700" color="#333">{todayLabel()}の表現</Text>
      </XStack>
      {loading ? (
        <YStack alignItems="center" paddingVertical="$3"><Spinner size="small" /></YStack>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 4 }}>
          {expressions.map((item) => <DailyCard key={item.id} item={item} />)}
        </ScrollView>
      )}
    </YStack>
  );
}

/** PC サイドバー用：縦積み */
export function DailySectionVertical() {
  const { expressions, loading } = useDailyExpressions();

  return (
    <YStack>
      <XStack alignItems="center" gap="$2" marginBottom="$3">
        <Ionicons name="sunny-outline" size={14} color="#BC002D" />
        <Text fontSize="$2" fontWeight="700" color="#333">{todayLabel()}の表現</Text>
      </XStack>
      {loading ? (
        <YStack alignItems="center" paddingVertical="$3"><Spinner size="small" /></YStack>
      ) : (
        expressions.map((item) => <DailyCard key={item.id} item={item} vertical />)
      )}
    </YStack>
  );
}

export function DailySection() {
  return <DailySectionHorizontal />;
}
