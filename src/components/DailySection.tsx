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
  const color = CATEGORY_COLOR[item.category] ?? '#555';

  return (
    <Card
      backgroundColor="white"
      borderWidth={1}
      borderColor={color}
      borderRadius="$3"
      padding="$3"
      marginBottom={vertical ? '$2' : undefined}
      marginRight={vertical ? undefined : '$2'}
      width={vertical ? '100%' : 210}
      pressStyle={{ opacity: 0.85 }}
      onPress={() => item.meaning && setShowMeaning((v) => !v)}
    >
      <YStack gap="$1">
        <Text fontSize="$1" fontWeight="700" letterSpacing={0.5} style={{ color }}>
          今日の{item.category}
        </Text>
        <Text fontSize={vertical ? '$5' : '$6'} fontWeight="800" letterSpacing={-0.5} numberOfLines={2}>
          {item.content}
        </Text>
        {item.meaning && (
          !showMeaning ? (
            <XStack alignItems="center" gap="$1" marginTop="$1">
              <Ionicons name="book-outline" size={12} color="#888" />
              <Text fontSize="$1" color="$color8">意味を見る</Text>
            </XStack>
          ) : (
            <YStack marginTop="$1" gap="$1">
              <Text fontSize="$2" color="$color11" lineHeight={18}>
                {item.meaning}
              </Text>
              {item.source_name && (
                <Text fontSize="$1" color="$color8">出典: {item.source_name}</Text>
              )}
              <XStack alignItems="center" gap="$1">
                <Ionicons name="chevron-up-outline" size={12} color="#888" />
                <Text fontSize="$1" color="$color8">閉じる</Text>
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
    <YStack paddingVertical="$2" borderBottomWidth={1} borderBottomColor="$borderColor">
      <XStack alignItems="center" gap="$2" paddingHorizontal="$3" marginBottom="$2">
        <Ionicons name="sunny-outline" size={15} color="#BC002D" />
        <Text fontSize="$2" fontWeight="700" color="$color11">{todayLabel()}の表現</Text>
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
    <YStack gap="$0">
      <XStack alignItems="center" gap="$2" marginBottom="$3">
        <Ionicons name="sunny-outline" size={15} color="#BC002D" />
        <Text fontSize="$3" fontWeight="700" color="$color11">{todayLabel()}の表現</Text>
      </XStack>
      {loading ? (
        <YStack alignItems="center" paddingVertical="$3"><Spinner size="small" /></YStack>
      ) : (
        expressions.map((item) => <DailyCard key={item.id} item={item} vertical />)
      )}
    </YStack>
  );
}

// 後方互換 export（モバイルデフォルト）
export function DailySection() {
  return <DailySectionHorizontal />;
}
