import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Text, XStack } from 'tamagui';
import { useVote } from '../hooks/useVote';
import { useAuth } from '../context/AuthContext';
import type { VoteType } from '../types';

interface Props {
  expressionId: string;
  appropriateCount: number;
  inappropriateCount: number;
  userVote?: VoteType | null;
}

export function VoteButtons({
  expressionId,
  appropriateCount,
  inappropriateCount,
  userVote: initialUserVote = null,
}: Props) {
  const { user } = useAuth();
  const { voting, vote } = useVote();
  const [userVote, setUserVote] = useState<VoteType | null>(initialUserVote);
  const [counts, setCounts] = useState({
    appropriate: appropriateCount,
    inappropriate: inappropriateCount,
  });

  async function handleVote(voteType: VoteType) {
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (userVote !== null) return;

    const success = await vote(expressionId, voteType, user.id);
    if (success) {
      setUserVote(voteType);
      setCounts((prev) => ({
        ...prev,
        [voteType]: prev[voteType] + 1,
      }));
    }
  }

  const voted = userVote !== null;

  return (
    <XStack gap="$2">
      <Button
        size="$2"
        onPress={() => handleVote('appropriate')}
        disabled={voted || voting}
        variant={userVote === 'appropriate' ? undefined : 'outlined'}
        theme={userVote === 'appropriate' ? 'green' : undefined}
      >
        <Text>👍 {counts.appropriate}</Text>
        {voted && userVote !== 'appropriate' && <Text fontSize="$1"> 投票済み</Text>}
      </Button>

      <Button
        size="$2"
        onPress={() => handleVote('inappropriate')}
        disabled={voted || voting}
        variant={userVote === 'inappropriate' ? undefined : 'outlined'}
        theme={userVote === 'inappropriate' ? 'red' : undefined}
      >
        <Text>👎 {counts.inappropriate}</Text>
        {voted && userVote !== 'inappropriate' && <Text fontSize="$1"> 投票済み</Text>}
      </Button>
    </XStack>
  );
}
