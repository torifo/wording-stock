import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';

const DAILY_CATEGORIES: Category[] = ['四字熟語', 'ことわざ', '慣用句'];

export interface DailyExpression {
  id: string;
  content: string;
  meaning: string | null;
  category: Category;
  source_name: string | null;
}

/**
 * 今日の日付 + カテゴリ名をシードにしたハッシュで offset を決定する。
 * 日付が変わるまで同じ表現が返り、日付が変わると自動的に次の表現に切り替わる。
 */
function getDailyOffset(total: number, category: string): number {
  // ローカル日付を使用（UTC だと JST 深夜0時が前日扱いになるため）
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const seed = today + category;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  }
  return hash % total;
}

async function fetchForCategory(category: Category): Promise<DailyExpression | null> {
  const { count } = await supabase
    .from('expressions')
    .select('*', { count: 'exact', head: true })
    .eq('category', category)
    .eq('visibility', true)
    .eq('censor_status', 'safe');

  if (!count || count === 0) return null;

  const offset = getDailyOffset(count, category);

  const { data, error } = await supabase
    .from('expressions')
    .select('id, content, meaning, category, source_name')
    .eq('category', category)
    .eq('visibility', true)
    .eq('censor_status', 'safe')
    .range(offset, offset)
    .single();

  if (error || !data) return null;
  return data as DailyExpression;
}

export function useDailyExpressions() {
  const [expressions, setExpressions] = useState<DailyExpression[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = await Promise.all(DAILY_CATEGORIES.map(fetchForCategory));
      if (!cancelled) {
        setExpressions(results.filter((r): r is DailyExpression => r !== null));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { expressions, loading };
}
