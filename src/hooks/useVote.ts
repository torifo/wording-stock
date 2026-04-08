import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { VoteType } from '../types';

interface UseVoteResult {
  voting: boolean;
  error: string;
  vote: (expressionId: string, voteType: VoteType, userId: string) => Promise<boolean>;
}

export function useVote(): UseVoteResult {
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');

  async function vote(
    expressionId: string,
    voteType: VoteType,
    userId: string,
  ): Promise<boolean> {
    setVoting(true);
    setError('');

    const { error: insertError } = await supabase.from('votes').insert({
      expression_id: expressionId,
      user_id: userId,
      vote_type: voteType,
    });

    setVoting(false);

    if (insertError) {
      // 重複投票エラー（unique 制約違反）は無視してフロントの状態で対応
      if (insertError.code !== '23505') {
        setError(insertError.message);
      }
      return false;
    }

    return true;
  }

  return { voting, error, vote };
}
