import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Expression, Category } from '../types';

const PAGE_SIZE = 20;

interface TimelineRow {
  id: string;
  content: string;
  category: string;
  censor_status: 'safe' | 'grey' | 'banned';
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
  appropriate_count: number;
  inappropriate_count: number;
}

function rowToExpression(row: TimelineRow): Expression {
  return {
    id: row.id,
    user_id: '',
    content: row.content,
    category: row.category as Category,
    censor_status: row.censor_status,
    is_ai_checked: false,
    visibility: true,
    created_at: row.created_at,
    profile: row.profiles
      ? { username: row.profiles.username, avatar_url: row.profiles.avatar_url }
      : undefined,
    appropriate_count: row.appropriate_count,
    inappropriate_count: row.inappropriate_count,
  };
}

interface UseTimelineOptions {
  category?: Category | null;
  keyword?: string;
}

interface UseTimelineResult {
  expressions: Expression[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string;
  fetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
}

export function useTimeline({ category, keyword }: UseTimelineOptions = {}): UseTimelineResult {
  const [expressions, setExpressions] = useState<Expression[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState('');

  function buildQuery(afterCursor: string | null) {
    let q = supabase
      .from('expressions')
      .select(`
        id,
        content,
        category,
        censor_status,
        created_at,
        profiles ( username, avatar_url ),
        appropriate_count:votes!inner(count)...vote_type.eq.appropriate,
        inappropriate_count:votes!inner(count)...vote_type.eq.inappropriate
      `)
      .eq('visibility', true)
      .in('censor_status', ['safe', 'grey'])
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (afterCursor) {
      q = q.lt('created_at', afterCursor);
    }
    if (category) {
      q = q.eq('category', category);
    }
    if (keyword && keyword.trim() !== '') {
      q = q.ilike('content', `%${keyword.trim()}%`);
    }

    return q;
  }

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    setCursor(null);

    const { data, error: fetchError } = await buildQuery(null);

    setLoading(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    const rows = (data ?? []) as unknown as TimelineRow[];
    setExpressions(rows.map(rowToExpression));
    setHasMore(rows.length === PAGE_SIZE);
    if (rows.length > 0) {
      setCursor(rows[rows.length - 1].created_at);
    }
  }, [category, keyword]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;

    setLoadingMore(true);
    const { data, error: fetchError } = await buildQuery(cursor);
    setLoadingMore(false);

    if (fetchError) {
      setError(fetchError.message);
      return;
    }

    const rows = (data ?? []) as unknown as TimelineRow[];
    setExpressions((prev) => [...prev, ...rows.map(rowToExpression)]);
    setHasMore(rows.length === PAGE_SIZE);
    if (rows.length > 0) {
      setCursor(rows[rows.length - 1].created_at);
    }
  }, [hasMore, loadingMore, cursor, category, keyword]);

  return { expressions, loading, loadingMore, hasMore, error, fetch, fetchMore };
}
