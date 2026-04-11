/**
 * ai-checker Edge Function
 *
 * is_ai_checked = false の表現をバッチで取得し、モデレーション判定を行う。
 * 判定結果（safe / grey / banned）を censor_status に書き込む。
 *
 * プロバイダーの切り替え:
 *   Supabase Dashboard → Edge Functions → Secrets で設定
 *   MODERATION_PROVIDER = hf_toxic_bert | hf_multilingual | openai | perspective | llm_judge
 *
 * 詳細は supabase/functions/ai-checker/classifiers.ts を参照
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getClassifier, type CensorStatus } from './classifiers.ts';

const BATCH_SIZE  = 50;
const INTERVAL_MS = 200;
const MAX_RETRIES = 3;

interface Expression {
  id: string;
  content: string;
}

Deno.serve(async (_req: Request): Promise<Response> => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 使用プロバイダーをログ出力
  const provider = Deno.env.get('MODERATION_PROVIDER') ?? 'hf_toxic_bert';
  console.log(`Moderation provider: ${provider}`);

  let classify: (content: string) => Promise<CensorStatus>;
  try {
    classify = getClassifier();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 400 });
  }

  // 未チェックの表現を取得
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
  console.log(`Processing ${batch.length} expressions with [${provider}]`);

  let processed = 0;
  let failed    = 0;

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
          return new Response(
            JSON.stringify({ error: 'rate limited', processed }),
            { status: 429 },
          );
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
        failed++;
      } else {
        processed++;
      }
    } else {
      console.error(`Gave up after ${MAX_RETRIES} retries: ${expr.id}`);
      failed++;
    }

    await sleep(INTERVAL_MS);
  }

  return new Response(
    JSON.stringify({ provider, processed, failed, total: batch.length }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
