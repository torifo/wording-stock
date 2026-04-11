import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Text, XStack } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useVote } from '../hooks/useVote';
import { useAuth } from '../context/AuthContext';

interface Props {
  expressionId: string;
  appropriateCount: number;
  inappropriateCount?: number; // 表示しないが型互換のため残す
  userVote?: 'appropriate' | 'inappropriate' | null;
}

export function VoteButtons({ expressionId, appropriateCount, userVote: initialUserVote = null }: Props) {
  const { user } = useAuth();
  const { voting, vote } = useVote();
  const [liked, setLiked]   = useState(initialUserVote === 'appropriate');
  const [count, setCount]   = useState(appropriateCount);

  async function handleLike() {
    if (!user) { router.push('/auth/login'); return; }
    if (liked || voting) return;
    const success = await vote(expressionId, 'appropriate', user.id);
    if (success) { setLiked(true); setCount((n) => n + 1); }
  }

  return (
    <XStack gap="$2" alignItems="center">
      <Button
        size="$2"
        onPress={handleLike}
        disabled={liked || voting}
        backgroundColor={liked ? '#BC002D' : 'transparent'}
        borderWidth={1}
        borderColor="#BC002D"
        pressStyle={{ opacity: 0.7 }}
      >
        <XStack alignItems="center" gap="$1">
          <Ionicons
            name={liked ? 'heart' : 'heart-outline'}
            size={14}
            color={liked ? 'white' : '#BC002D'}
          />
          <Text fontSize="$2" color={liked ? 'white' : '#BC002D'}>
            いいね {count > 0 ? count : ''}
          </Text>
        </XStack>
      </Button>
    </XStack>
  );
}
