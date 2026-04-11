/**
 * コンテンツモデレーション プロバイダー実装（無料枠のみ使用）
 *
 * 環境変数 MODERATION_PROVIDER で切り替え（すべて無料）:
 *   hf_toxic_bert   … Hugging Face unitary/toxic-bert（英語特化・軽量）
 *   hf_multilingual … Hugging Face multilingual-toxic-xlm-roberta（多言語・日本語可）
 *   openai          … OpenAI Moderation API（無料エンドポイント・日本語良好）★デフォルト推奨
 *   perspective     … Google Perspective API（日本語最強・無料 1 QPS）
 *
 * ※ llm_judge（GPT-4o-mini）は従量課金のため除外
 *
 * 必要な環境変数（Supabase Dashboard → Edge Functions → Secrets）:
 *   hf_toxic_bert / hf_multilingual : HF_API_TOKEN
 *   openai                          : OPENAI_API_KEY
 *   perspective                     : PERSPECTIVE_API_KEY
 *
 * 取得手順: docs/moderation-setup.md を参照
 */

export type CensorStatus = 'safe' | 'grey' | 'banned';

const GREY_THRESHOLD   = 0.4;
const BANNED_THRESHOLD = 0.7;

function scoreToStatus(score: number): CensorStatus {
  if (score >= BANNED_THRESHOLD) return 'banned';
  if (score >= GREY_THRESHOLD)   return 'grey';
  return 'safe';
}

// ── 共通エラー型 ─────────────────────────────────────────────────────────

function rateLimitError(): Error & { status: number } {
  const e = new Error('Rate limited') as Error & { status: number };
  e.status = 429;
  return e;
}

// ── 1. Hugging Face: unitary/toxic-bert（英語向け・デフォルト）──────────

export async function classifyHfToxicBert(content: string): Promise<CensorStatus> {
  const token = Deno.env.get('HF_API_TOKEN');
  if (!token) throw new Error('HF_API_TOKEN is not set');

  const res = await fetch(
    'https://api-inference.huggingface.co/models/unitary/toxic-bert',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: content }),
    },
  );
  if (res.status === 429) throw rateLimitError();
  if (!res.ok) throw new Error(`HF toxic-bert error: ${res.status}`);

  // レスポンス: [[{ label: "toxic"|"non_toxic", score: number }]]
  const json = await res.json() as { label: string; score: number }[][];
  const toxicScore = (json[0] ?? []).find((r) => r.label === 'toxic')?.score ?? 0;
  return scoreToStatus(toxicScore);
}

// ── 2. Hugging Face: multilingual-toxic-xlm-roberta（多言語・日本語対応）

export async function classifyHfMultilingual(content: string): Promise<CensorStatus> {
  const token = Deno.env.get('HF_API_TOKEN');
  if (!token) throw new Error('HF_API_TOKEN is not set');

  const res = await fetch(
    'https://api-inference.huggingface.co/models/unitary/multilingual-toxic-xlm-roberta',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: content }),
    },
  );
  if (res.status === 429) throw rateLimitError();
  if (!res.ok) throw new Error(`HF multilingual error: ${res.status}`);

  // レスポンス形式は toxic-bert と同様
  const json = await res.json() as { label: string; score: number }[][];
  const toxicScore = (json[0] ?? []).find((r) => r.label === 'toxic')?.score ?? 0;
  return scoreToStatus(toxicScore);
}

// ── 3. OpenAI Moderation API（無料・日本語良好）────────────────────────

export async function classifyOpenAI(content: string): Promise<CensorStatus> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const res = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: content, model: 'omni-moderation-latest' }),
  });
  if (!res.ok) throw new Error(`OpenAI Moderation error: ${res.status}`);

  const json = await res.json() as {
    results: { flagged: boolean; category_scores: Record<string, number> }[];
  };
  const result = json.results[0];
  if (!result.flagged) return 'safe';

  // 最高スコアで深刻度を判断
  const maxScore = Math.max(...Object.values(result.category_scores));
  return maxScore >= 0.8 ? 'banned' : 'grey';
}

// ── 4. Google Perspective API（日本語最強・無料枠 1 QPS）────────────────

export async function classifyPerspective(content: string): Promise<CensorStatus> {
  const apiKey = Deno.env.get('PERSPECTIVE_API_KEY');
  if (!apiKey) throw new Error('PERSPECTIVE_API_KEY is not set');

  const res = await fetch(
    `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: { text: content },
        languages: ['ja'],
        requestedAttributes: {
          TOXICITY: {},
          SEVERE_TOXICITY: {},
          INSULT: {},
          THREAT: {},
        },
      }),
    },
  );
  if (res.status === 429) throw rateLimitError();
  if (!res.ok) throw new Error(`Perspective API error: ${res.status}`);

  const json = await res.json() as {
    attributeScores: Record<string, { summaryScore: { value: number } }>;
  };
  const toxicity       = json.attributeScores.TOXICITY?.summaryScore.value ?? 0;
  const severeToxicity = json.attributeScores.SEVERE_TOXICITY?.summaryScore.value ?? 0;
  return scoreToStatus(Math.max(toxicity, severeToxicity));
}

// ── 5. LLM-as-a-judge（OpenAI GPT-4o-mini・最も柔軟）───────────────────

const LLM_SYSTEM_PROMPT = `あなたはコンテンツモデレーターです。与えられたテキストの有害性を評価し、必ず以下の JSON だけを返してください。

{"status":"safe"|"grey"|"banned","reason":"判断理由（30文字以内の日本語）"}

判断基準:
- safe  : 問題なし（四字熟語・慣用句・詩的表現など通常の文化的コンテンツを含む）
- grey  : 要注意（文脈次第では不適切・境界線上）
- banned: 不適切（ヘイトスピーチ・暴力的脅迫・差別表現・露骨な性的内容）

このアプリは日本語の表現（四字熟語・慣用句・ことわざ等）を共有する SNS です。
正当な日本語表現は safe と判断してください。`;

export async function classifyLLMJudge(content: string): Promise<CensorStatus> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: LLM_SYSTEM_PROMPT },
        { role: 'user',   content: content },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 80,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI Chat API error: ${res.status}`);

  const json = await res.json() as {
    choices: { message: { content: string } }[];
  };
  const parsed = JSON.parse(json.choices[0].message.content) as { status: string };
  const s = parsed.status;
  return (s === 'banned' || s === 'grey' || s === 'safe') ? s : 'safe';
}

// ── プロバイダーファクトリ ────────────────────────────────────────────────

export type ClassifyFn = (content: string) => Promise<CensorStatus>;

export function getClassifier(): ClassifyFn {
  const provider = Deno.env.get('MODERATION_PROVIDER') ?? 'openai';
  switch (provider) {
    case 'hf_toxic_bert':   return classifyHfToxicBert;
    case 'hf_multilingual': return classifyHfMultilingual;
    case 'openai':          return classifyOpenAI;
    case 'perspective':     return classifyPerspective;
    // llm_judge は従量課金のため無効化（使用する場合は明示的に有効化すること）
    case 'llm_judge':
      throw new Error('llm_judge は従量課金プランです。無料プロバイダー (openai / perspective / hf_multilingual / hf_toxic_bert) を使用してください。');
    default:
      throw new Error(`Unknown MODERATION_PROVIDER: "${provider}". Choose from: openai, perspective, hf_multilingual, hf_toxic_bert`);
  }
}
