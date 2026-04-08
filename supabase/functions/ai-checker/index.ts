import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BATCH_SIZE = 50;
const INTERVAL_MS = 200;
const MAX_RETRIES = 3;

// toxic スコアの閾値
// 0.0〜0.4 : safe
// 0.4〜0.7 : grey（ユーザー投票に委ねる）
// 0.7〜1.0 : banned
const GREY_THRESHOLD = 0.4;
const BANNED_THRESHOLD = 0.7;

type CensorStatus = 'safe' | 'grey' | 'banned';

interface Expression {
  id: string;
  content: string;
}

interface HfClassificationResult {
  label: string;
  score: number;
}

Deno.serve(async (_req: Request): Promise<Response> => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: expressions, error: fetchError } = await supabase
    .from('expressions')
    .select('id, content')
    .eq('is_ai_checked', false)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error('fetch error:', fetchError);
    return new Response(JSON.stringify({ error: 'fetch error' }), { status: 500 });
  }

  const batch = (expressions ?? []) as Expression[];
  console.log(`Processing ${batch.length} expressions`);

  for (const expr of batch) {
    let censorStatus: CensorStatus = 'safe';
    let success = false;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        censorStatus = await classify(expr.content);
        success = true;
        break;
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        if (status === 429) {
          console.warn('Rate limit hit, stopping batch');
          return new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 });
        }
        const backoff = INTERVAL_MS * Math.pow(2, attempt);
        console.warn(`Retry ${attempt + 1} for ${expr.id} after ${backoff}ms`);
        await sleep(backoff);
      }
    }

    if (success) {
      const { error: updateError } = await supabase
        .from('expressions')
        .update({ censor_status: censorStatus, is_ai_checked: true })
        .eq('id', expr.id);

      if (updateError) {
        console.error(`Failed to update ${expr.id}:`, updateError);
      }
    } else {
      console.error(`Failed after ${MAX_RETRIES} retries: ${expr.id}`);
    }

    await sleep(INTERVAL_MS);
  }

  return new Response(JSON.stringify({ processed: batch.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

/**
 * Hugging Face Inference API（unitary/toxic-bert）で有害度を判定する
 *
 * toxic スコアで 3 段階に分類：
 *   0.0〜0.4 → safe
 *   0.4〜0.7 → grey
 *   0.7〜1.0 → banned
 *
 * 環境変数 HF_API_TOKEN に Hugging Face の無料アクセストークンを設定すること
 */
async function classify(content: string): Promise<CensorStatus> {
  const token = Deno.env.get('HF_API_TOKEN');
  if (!token) {
    throw new Error('HF_API_TOKEN is not set');
  }

  const response = await fetch(
    'https://api-inference.huggingface.co/models/unitary/toxic-bert',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: content }),
    },
  );

  if (response.status === 429) {
    const err = new Error('Rate limited') as Error & { status: number };
    err.status = 429;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`HF API error: ${response.status}`);
  }

  // レスポンス例: [[{ label: "toxic", score: 0.95 }, { label: "non_toxic", score: 0.05 }]]
  const json = await response.json() as HfClassificationResult[][];
  const results = json[0] ?? [];
  const toxicScore = results.find((r) => r.label === 'toxic')?.score ?? 0;

  if (toxicScore >= BANNED_THRESHOLD) return 'banned';
  if (toxicScore >= GREY_THRESHOLD) return 'grey';
  return 'safe';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
