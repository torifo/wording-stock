import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { VoteType } from '../types';

interface UseVoteResult {
  voting: boolean;
  error: string;
  vote: (expressionId: string, voteType: VoteType, userId: string) => Promise<boolean>;
  unlike: (expressionId: string, userId: string) => Promise<boolean>;
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
      if (insertError.code !== '23505') {
        setError(insertError.message);
      }
      return false;
    }

    return true;
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
