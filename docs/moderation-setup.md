# コンテンツモデレーション セットアップガイド

ai-checker Edge Function で使用するモデレーション API の取得手順。
**すべて無料枠の範囲内で動作する。**

---

## プロバイダー比較

| プロバイダー | 日本語精度 | 無料枠 | 速度 | 必要キー |
|---|---|---|---|---|
| `openai` ★推奨 | ◯ | 完全無料（呼び出し上限なし） | 速い | `OPENAI_API_KEY` |
| `perspective` | ◎ 最強 | 無料（1 QPS 制限） | 普通 | `PERSPECTIVE_API_KEY` |
| `hf_multilingual` | ◯ | 完全無料（推論時間制限あり） | 遅め | `HF_API_TOKEN` |
| `hf_toxic_bert` | △（英語特化） | 完全無料 | 速い | `HF_API_TOKEN` |

> `llm_judge`（GPT-4o-mini）は従量課金のため除外済み。

**まず `openai` から始め、日本語精度が足りなければ `perspective` に切り替えるのが最もスムーズ。**

---

## Step 1：OpenAI API キーを取得する（`openai` プロバイダー用）

OpenAI の Moderation API は**完全無料**（通常の Chat API とは別扱い）。

1. [platform.openai.com](https://platform.openai.com) にアクセス → サインアップ（または Google/Microsoft でログイン）
2. 右上メニュー → **API keys** → **Create new secret key**
3. キー名を入力（例: `wording-stock`）→ **Create secret key**
4. 表示された `sk-...` をコピー（再表示されないので必ず保存）

> ⚠️ **クレジットカード登録について**
> OpenAI アカウント作成自体は無料。ただし API キーを使うには支払い方法の登録が必要な場合がある。
> Moderation API 自体は課金されないが、アカウント設定 → Billing でカードを登録しておくと制限が緩和される。

---

## Step 2：Google Perspective API キーを取得する（`perspective` プロバイダー用）

日本語モデレーションの精度が最も高い。無料枠は **1 QPS（1秒に1リクエスト）**。

### 2-1. Google Cloud プロジェクトを作成

1. [console.cloud.google.com](https://console.cloud.google.com) にアクセス → Google アカウントでログイン
2. 上部のプロジェクト選択 → **新しいプロジェクト**
3. プロジェクト名: `wording-stock`（任意）→ **作成**

### 2-2. Perspective API を有効化

1. 左メニュー → **APIとサービス** → **ライブラリ**
2. 検索欄に `Perspective` と入力
3. **Perspective Comment Analyzer API** → **有効にする**

### 2-3. API キーを作成

1. 左メニュー → **APIとサービス** → **認証情報**
2. **認証情報を作成** → **API キー**
3. 作成された `AIza...` のキーをコピー
4. **キーを制限する**（任意・推奨）→ API の制限 → Perspective Comment Analyzer API のみに絞る

> ⚠️ **無料枠の注意点**
> - 1 QPS を超えると 429 エラー → ai-checker の `INTERVAL_MS`（現在 200ms）で自動的に間隔を空けているので通常は問題ない
> - 大量処理が必要な場合は [割り当て増加をリクエスト](https://developers.perspectiveapi.com/s/request-quota-increase) できる（無料）

---

## Step 3：Hugging Face トークンを取得する（`hf_*` プロバイダー用）

完全無料。ただし推論時間に月間制限あり（無料枠: 約 1,000 リクエスト/月）。

1. [huggingface.co](https://huggingface.co) → **Sign Up**（GitHub/Google でも可）
2. 右上アバター → **Settings** → 左メニュー **Access Tokens**
3. **New token** → Token name: `wording-stock`、Role: **Read** → **Generate a token**
4. 表示された `hf_...` をコピー

---

## Step 4：Supabase に設定する

取得したキーを Supabase の Edge Function Secrets に登録する。

1. [Supabase ダッシュボード](https://supabase.com/dashboard) → プロジェクト選択
2. 左メニュー → **Edge Functions** → `ai-checker` → **Secrets**
3. 以下を追加：

```
MODERATION_PROVIDER = openai        ← 使用するプロバイダー名
OPENAI_API_KEY      = sk-xxxx       ← openai の場合
```

perspective を使う場合:
```
MODERATION_PROVIDER  = perspective
PERSPECTIVE_API_KEY  = AIzaxxxx
```

hf_* を使う場合:
```
MODERATION_PROVIDER = hf_multilingual
HF_API_TOKEN        = hf_xxxx
```

---

## Step 5：動作確認

Supabase ダッシュボード → Edge Functions → `ai-checker` → **Invoke** ボタン → レスポンスを確認。

正常時のレスポンス例:
```json
{
  "provider": "openai",
  "processed": 3,
  "failed": 0,
  "total": 3
}
```

---

## プロバイダーの切り替え方

`MODERATION_PROVIDER` の値を変更して **Save** するだけ。再デプロイ不要。

```
openai          → perspective    # 日本語精度を上げたい
perspective     → hf_multilingual  # Google Cloud を使いたくない
```
