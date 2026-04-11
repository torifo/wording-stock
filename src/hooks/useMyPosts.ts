import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Expression, Category } from '../types';

export function useMyPosts(userId: string | undefined) {
  const [posts, setPosts]     = useState<Expression[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');

    const { data, error: fetchError } = await supabase
      .from('expressions')
      .select('id, content, meaning, category, censor_status, created_at, source_name, source_url, appropriate_count, inappropriate_count')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setLoading(false);
    if (fetchError) { setError(fetchError.message); return; }

    const rows = (data ?? []).map((r: any): Expression => ({
      id: r.id, user_id: userId,
      content: r.content, meaning: r.meaning ?? null,
      source_name: r.source_name ?? null, source_url: r.source_url ?? null,
      category: r.category as Category,
      censor_status: r.censor_status, is_ai_checked: true, visibility: true,
      created_at: r.created_at,
      appropriate_count: r.appropriate_count ?? 0,
      inappropriate_count: r.inappropriate_count ?? 0,
    }));
    setPosts(rows);
  }, [userId]);

  const deletePost = useCallback(async (id: string) => {
    const { error: delError } = await supabase.from('expressions').delete().eq('id', id);
    if (delError) return delError.message;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    return null;
  }, []);

  const updatePost = useCallback(async (
    id: string,
    fields: { content: string; meaning: string; category: Category }
  ) => {
    const { error: upErr } = await supabase
      .from('expressions')
      .update({ content: fields.content, meaning: fields.meaning.trim() || null, category: fields.category })
      .eq('id', id);
    if (upErr) return upErr.message;
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, ...fields, meaning: fields.meaning.trim() || null } : p));
    return null;
  }, []);

  return { posts, loading, error, fetch, deletePost, updatePost };
}
