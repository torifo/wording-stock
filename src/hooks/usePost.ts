import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { checkBlocklist } from '../lib/clientFilter';
import type { Category } from '../types';

interface PostInput {
  content: string;
  meaning: string;
  category: Category;
  userId: string;
}

interface UsePostResult {
  posting: boolean;
  error: string;
  warning: string;
  post: (input: PostInput) => Promise<boolean>;
  clearMessages: () => void;
}

export function usePost(): UsePostResult {
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');

  function clearMessages() {
    setError('');
    setWarning('');
  }

  async function post({ content, meaning, category, userId }: PostInput): Promise<boolean> {
    clearMessages();

    // ClientFilter で禁止用語チェック
    let blocked = false;
    try {
      blocked = checkBlocklist(content);
    } catch {
      setError('フィルターの初期化に失敗しました');
      return false;
    }

    if (blocked) {
      setWarning('この表現には不適切な用語が含まれている可能性があります');
      return false;
    }

    setPosting(true);
    const { error: insertError } = await supabase.from('expressions').insert({
      user_id: userId,
      content,
      meaning: meaning.trim() || null,
      category,
      censor_status: 'safe',
    });
    setPosting(false);

    if (insertError) {
      setError(insertError.message);
      return false;
    }

    return true;
  }

  return { posting, error, warning, post, clearMessages };
}
