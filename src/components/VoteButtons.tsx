import { useState, useRef } from 'react';
import { router } from 'expo-router';
import { Button, Text, XStack } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';
import { useVote } from '../hooks/useVote';
import { useAuth } from '../context/AuthContext';

const DEBOUNCE_MS = 600;

interface Props {
  expressionId: string;
  appropriateCount: number;
  inappropriateCount?: number;
  userVote?: 'appropriate' | 'inappropriate' | null;
  iLiked?: boolean;
  showCount?: boolean;
  onLikeChange?: (expressionId: string, liked: boolean) => void;
}

export function VoteButtons({
  expressionId,
  appropriateCount,
  iLiked,
  showCount = true,
  onLikeChange,
}: Props) {
  const { user } = useAuth();
  const { voting, vote, unlike } = useVote();
  const [liked, setLiked] = useState(iLiked ?? false);
  const [count, setCount] = useState(appropriateCount);
  const lastActionAt = useRef<number>(0);

  // iLiked prop が非同期で更新されたとき（likedIds ロード完了後）に UI を同期
  const prevILiked = useRef(iLiked);
  if (prevILiked.current !== iLiked && iLiked !== undefined) {
    prevILiked.current = iLiked;
    if (liked !== iLiked) setLiked(iLiked);
  }

  async function handleLike() {
    const now = Date.now();
    if (now - lastActionAt.current < DEBOUNCE_MS) return;
    lastActionAt.current = now;

    if (!user) { router.push('/auth/login'); return; }
    if (voting) return;

    if (liked) {
      const success = await unlike(expressionId, user.id);
      if (success) {
        setLiked(false);
        setCount((n) => Math.max(0, n - 1));
        onLikeChange?.(expressionId, false);
      }
    } else {
      const result = await vote(expressionId, 'appropriate', user.id);
      if (result === 'inserted') {
        setLiked(true);
        setCount((n) => n + 1);
        onLikeChange?.(expressionId, true);
      } else if (result === 'already_exists') {
        // DB にはすでにいいね済み → UI だけ同期（カウントは変えない）
        setLiked(true);
        onLikeChange?.(expressionId, true);
      }
    }
  }

  return (
    <XStack gap="$2" alignItems="center">
      <Button
        size="$2"
        onPress={handleLike}
        disabled={voting}
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
            {showCount && count > 0 ? `いいね ${count}` : 'いいね'}
          </Text>
        </XStack>
      </Button>
    </XStack>
  );
}
