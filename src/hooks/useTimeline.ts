import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Expression, Category } from '../types';

const PAGE_SIZE = 20;

interface TimelineRow {
  id: string;
  content: string;
  meaning: string | null;
  source_name: string | null;
  category: string;
  censor_status: 'safe' | 'grey' | 'banned';
  created_at: string;
  appropriate_count: number;
  inappropriate_count: number;
  profiles: { username: string; avatar_url: string | null } | null;
}

function rowToExpression(row: TimelineRow): Expression {
  return {
    id: row.id,
    user_id: '',
    content: row.content,
    meaning: row.meaning ?? null,
    source_name: row.source_name ?? null,
    source_url: null,
    category: row.category as Category,
    censor_status: row.censor_status,
    is_ai_checked: true,
    visibility: true,
    created_at: row.created_at,
    profile: row.profiles
      ? { username: row.profiles.username, avatar_url: row.profiles.avatar_url }
      : undefined,
    appropriate_count: row.appropriate_count ?? 0,
    inappropriate_count: row.inappropriate_count ?? 0,
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
        meaning,
        source_name,
        category,
        censor_status,
        created_at,
        appropriate_count,
        inappropriate_count,
        profiles ( username, avatar_url )
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
