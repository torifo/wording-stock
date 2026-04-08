import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BATCH_SIZE = 50;
const INTERVAL_MS = 200;
const MAX_RETRIES = 3;

type CensorStatus = 'safe' | 'grey' | 'banned';

interface Expression {
  id: string;
  content: string;
}

Deno.serve(async (_req: Request): Promise<Response> => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // is_ai_checked = false の Expression を最大 50 件取得（created_at 昇順）
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
        censorStatus = await callAI(expr.content);
        success = true;
        break;
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        if (status === 429) {
          // レート制限: 即時中断、is_ai_checked は false のまま保持
          console.warn('Rate limit hit, stopping batch');
          return new Response(JSON.stringify({ error: 'rate limited' }), { status: 429 });
        }
        // その他エラー: 指数バックオフでリトライ
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
      // 3 回失敗: is_ai_checked は false のまま保持
      console.error(`Failed after ${MAX_RETRIES} retries: ${expr.id}`);
    }

    // 呼び出し間隔 200ms
    await sleep(INTERVAL_MS);
  }

  return new Response(JSON.stringify({ processed: batch.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * AI API を呼び出してコンテンツの検閲ステータスを判定する
 *
 * 実際の AI プロバイダー（Anthropic / OpenAI 等）に合わせて実装する。
 * 環境変数 AI_API_KEY を使用すること。
 */
async function callAI(content: string): Promise<CensorStatus> {
  const apiKey = Deno.env.get('AI_API_KEY');
  if (!apiKey) {
    throw new Error('AI_API_KEY is not set');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: `以下の日本語テキストを審査してください。
結果を必ず次の3つのうち1単語だけで返してください: safe / grey / banned

- safe: 問題なし
- grey: やや不適切または曖昧（ユーザー判断に委ねる）
- banned: 明らかに有害・差別的・違法

テキスト: 「${content}」`,
        },
      ],
    }),
  });

  if (response.status === 429) {
    const err = new Error('Rate limited') as Error & { status: number };
    err.status = 429;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const json = await response.json();
  const result = (json.content?.[0]?.text ?? 'safe').trim().toLowerCase();

  if (result === 'banned') return 'banned';
  if (result === 'grey') return 'grey';
  return 'safe';
}
