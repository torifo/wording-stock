import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Expression, Category } from '../types';

export function useFavorites(userId: string | undefined) {
  const [favorites, setFavorites] = useState<Expression[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** タイムライン用: お気に入り ID セットだけ取得 */
  const fetchIds = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('favorites')
      .select('expression_id')
      .eq('user_id', userId);
    setFavoriteIds(new Set((data ?? []).map((r: any) => r.expression_id)));
  }, [userId]);

  /** プロフィール用: お気に入り一覧を取得 */
  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError('');

    const { data, error: fetchError } = await supabase
      .from('favorites')
      .select(`
        expression_id,
        expressions (
          id, content, meaning, category, censor_status, created_at,
          source_name, source_url, appropriate_count, inappropriate_count,
          profiles ( username, avatar_url )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setLoading(false);
    if (fetchError) { setError(fetchError.message); return; }

    const rows: Expression[] = (data ?? [])
      .map((r: any) => r.expressions)
      .filter(Boolean)
      .map((e: any): Expression => ({
        id: e.id, user_id: '',
        content: e.content, meaning: e.meaning ?? null,
        source_name: e.source_name ?? null, source_url: e.source_url ?? null,
        category: e.category as Category,
        censor_status: e.censor_status, is_ai_checked: true, visibility: true,
        created_at: e.created_at,
        profile: e.profiles ?? undefined,
        appropriate_count: e.appropriate_count ?? 0,
        inappropriate_count: e.inappropriate_count ?? 0,
        isFavorited: true,
      }));

    setFavorites(rows);
    setFavoriteIds(new Set(rows.map((e) => e.id)));
  }, [userId]);

  const toggle = useCallback(async (expressionId: string): Promise<boolean> => {
    if (!userId) return false;
    const already = favoriteIds.has(expressionId);

    if (already) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('expression_id', expressionId);
      setFavoriteIds((prev) => { const s = new Set(prev); s.delete(expressionId); return s; });
      setFavorites((prev) => prev.filter((e) => e.id !== expressionId));
      return false;
    } else {
      await supabase.from('favorites').insert({ user_id: userId, expression_id: expressionId });
      setFavoriteIds((prev) => new Set([...prev, expressionId]));
      return true;
    }
  }, [userId, favoriteIds]);

  return { favorites, favoriteIds, loading, error, fetch, fetchIds, toggle };
}
