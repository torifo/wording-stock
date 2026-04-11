import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { VoteType } from '../types';

export type VoteResult = 'inserted' | 'already_exists' | 'error';

interface UseVoteResult {
  voting: boolean;
  error: string;
  vote: (expressionId: string, voteType: VoteType, userId: string) => Promise<VoteResult>;
  unlike: (expressionId: string, userId: string) => Promise<boolean>;
}

export function useVote(): UseVoteResult {
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');

  async function vote(
    expressionId: string,
    voteType: VoteType,
    userId: string,
  ): Promise<VoteResult> {
    setVoting(true);
    setError('');

    const { error: insertError } = await supabase.from('votes').insert({
      expression_id: expressionId,
      user_id: userId,
      vote_type: voteType,
    });

    setVoting(false);

    if (insertError) {
      // 23505 = unique 制約違反 = すでにいいね済み → UI を同期させるため already_exists を返す
      if (insertError.code === '23505') return 'already_exists';
      setError(insertError.message);
      return 'error';
    }

    return 'inserted';
  }

  async function unlike(expressionId: string, userId: string): Promise<boolean> {
    setVoting(true);
    setError('');

    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('expression_id', expressionId)
      .eq('user_id', userId)
      .eq('vote_type', 'appropriate');

    setVoting(false);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    return true;
  }

  return { voting, error, vote, unlike };
}
