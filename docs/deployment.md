# Wording-Stock デプロイ手順書

Web（Vercel）・Android APK 配布・Play Store 公開までの全フロー。

---

## アーキテクチャ概要

```
[ブラウザ / Android スマホ]
        ↓
┌───────────────────┐   ┌────────────────────────┐
│  Vercel (CDN)     │   │  Google Play Store     │
│  静的 SPA を配信   │   │  または APK 直接配布    │
└────────┬──────────┘   └───────────┬────────────┘
         │                          │
         └──────────┬───────────────┘
                    ↓ HTTPS API 通信
        ┌───────────────────────────┐
        │        Supabase           │
        │  PostgreSQL + Auth        │
        │  Storage + Edge Functions │
        └───────────────────────────┘
```

- **Web サーバー不要**：HTML/JS を CDN から配信するだけ
- **アプリサーバー不要**：Supabase が DB・認証・ストレージをすべて担当
- Web とモバイルは同じ Supabase バックエンドに接続する

---

## Phase 1：GitHub リポジトリを公開する

### 1-1. GitHub でリポジトリ作成

1. [github.com](https://github.com) にログイン
2. New repository → リポジトリ名: `wording-stock` → **Private** → Create
3. `.kiro/` `.claude/` `CLAUDE.md` は `.gitignore` で除外済みなので push しても問題なし

### 1-2. リモートを追加して push

```bash
git remote add origin https://github.com/<your-username>/wording-stock.git
git push -u origin main
```

---

## Phase 2：Supabase の確認・Edge Functions デプロイ

### 2-1. 環境変数の確認（`.env.local`）

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

> `.env.local` は `.gitignore` で除外済み。GitHub には上がらない。

### 2-2. DB マイグレーション（適用済み ✅）

```
supabase/migrations/
  20260409000001_initial_schema.sql   ← profiles / expressions / votes
  20260409000002_triggers.sql         ← handle_new_user / moderation_hook
```

Supabase ダッシュボード → Table Editor で profiles / expressions / votes テーブルが存在すれば OK。

### 2-3. Storage バケット（設定済み ✅）

| バケット名 | 公開 | 最大サイズ | 許可 MIME |
|---|---|---|---|
| avatars | Public | 5MB | image/jpeg, image/png, image/gif, image/webp |

### 2-4. Edge Functions のデプロイ（ai-checker）

```bash
# Supabase CLI のインストール（未インストールの場合）
npm install -g supabase

# ログイン
supabase login

# プロジェクトにリンク（Project ID は Supabase ダッシュボードの URL から取得）
supabase link --project-ref <project-id>

# デプロイ
supabase functions deploy ai-checker
```

デプロイ後、Supabase ダッシュボード → Edge Functions → `ai-checker` が表示されれば OK。

### 2-5. テストユーザーの作成

```bash
# 事前に Supabase ダッシュボードで設定:
# Authentication → Providers → Email → "Confirm email" を OFF

node scripts/seed-test-users.js
```

作成されるアカウント（`test-accounts.local.md` に記録）:

| メール | パスワード |
|---|---|
| test01@wording-stock.local | testpass01 |
| test02@wording-stock.local | testpass02 |
| test03@wording-stock.local | testpass03 |

---

## Phase 3：Vercel で Web を公開する

### 3-1. Vercel にインポート

1. [vercel.com](https://vercel.com) にアクセス → GitHub でログイン
2. **New Project** → GitHub の `wording-stock` リポジトリを選択
3. `vercel.json` が検出され、以下が自動設定される：
   - Build Command: `npx expo export -p web --output-dir dist`
   - Output Directory: `dist`

### 3-2. 環境変数を設定

Vercel の Project Settings → Environment Variables に以下を追加：

| Key | Value |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `.env.local` の値 |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` の値 |

**Production・Preview・Development すべてにチェック**を入れること。

### 3-3. デプロイ実行

Settings 画面下部の **Deploy** を押す、または：

```bash
# 以降は git push するたびに自動デプロイされる
git push origin main
```

### 3-4. 独自ドメインの設定

1. Vercel Project → Settings → Domains → ドメインを入力（例: `wordingstock.jp`）
2. Vercel が表示する DNS レコードをドメイン管理画面で設定：

```
種別: CNAME
名前: @（または www）
値:   cname.vercel-dns.com
```

または A レコードの場合：
```
種別: A
名前: @
値:   76.76.21.21
```

3. DNS 反映後（数分〜数時間）、HTTPS が自動で有効になる

### 3-5. PWA として「ホーム画面に追加」

Vercel 公開後、スマホの Chrome で URL を開き：

> Chrome メニュー（…）→「ホーム画面に追加」→「追加」

アイコンがホーム画面に作成され、フルスクリーンでアプリのように起動する。

---

## Phase 4：Android APK を直接配布する（審査なし）

Play Store の審査前に、APK ファイルを直接配布してテスト・内部共有ができる。

### 4-1. EAS CLI のセットアップ

```bash
# EAS CLI インストール
npm install -g eas-cli

# Expo アカウントでログイン（未登録なら expo.dev でアカウント作成）
eas login

# プロジェクトを Expo に登録（初回のみ・app.json に "extra.eas.projectId" が追記される）
eas build:configure
```

### 4-2. Preview APK をビルド

```bash
eas build -p android --profile preview
```

- Expo のクラウドサーバーでビルドが実行される（20〜30 分）
- ビルド完了後、[expo.dev](https://expo.dev) のダッシュボードに APK のダウンロード URL が表示される

### 4-3. APK を配布・インストール

**配布方法：**
- ダウンロード URL を LINE/メール/Slack などで共有する
- または APK ファイルをそのまま送る（Google Drive など）

**インストール手順（受け取る側）：**

1. Android の設定 → セキュリティ（またはアプリと通知）→「提供元不明のアプリ」を許可
2. APK ファイルを開く → インストール
3. ホーム画面にアイコンが追加される

---

## Phase 5：Google Play Store に公開する（正式審査）

### 5-1. Google Play Console の準備

1. [play.google.com/console](https://play.google.com/console) でデベロッパー登録（$25 の一回払い）
2. 新しいアプリを作成 → アプリ名・説明・スクリーンショット・アイコンを準備

### 5-2. 本番ビルド（AAB 形式）

```bash
eas build -p android --profile production
```

APK ではなく `.aab`（Android App Bundle）形式で出力される。Play Store はこちらを要求する。

### 5-3. ストアへの申請

```bash
# EAS Submit で自動アップロードも可能
eas submit -p android --latest
```

または Play Console のダッシュボードから手動で AAB をアップロードする。

### 5-4. 審査について

- 初回審査：3〜7 日程度
- 審査通過後、「リリース管理」→「公開」で世界に公開される

---

## 作業チェックリスト

```
Phase 1: GitHub
  [ ] リポジトリ作成（Private）
  [ ] git remote add origin ...
  [ ] git push -u origin main

Phase 2: Supabase
  [ ] DB マイグレーション適用済み確認
  [ ] Storage バケット（avatars）確認
  [ ] Edge Functions（ai-checker）デプロイ
  [ ] テストユーザー作成・動作確認

Phase 3: Vercel
  [ ] Vercel にリポジトリをインポート
  [ ] 環境変数（SUPABASE_URL / ANON_KEY）を設定
  [ ] 初回デプロイ確認
  [ ] 独自ドメイン設定
  [ ] PWA（ホーム画面に追加）動作確認

Phase 4: APK 直接配布
  [ ] eas-cli インストール・ログイン
  [ ] eas build:configure（初回）
  [ ] eas build -p android --profile preview
  [ ] APK を実機でインストール・動作確認

Phase 5: Play Store（正式公開）
  [ ] Google Play Console 登録
  [ ] アプリのストアページ作成（説明・スクリーンショット・アイコン）
  [ ] eas build -p android --profile production
  [ ] Play Store に AAB をアップロード・申請
  [ ] 審査通過 → 公開
```

---

## 補足：ローカル開発フロー（参考）

```bash
# 開発サーバー起動（ポート自動解放 → Expo 起動）
npm start -- --clear

# Web のみ確認
npm run web

# Web ビルド（Vercel デプロイ確認用）
npm run build:web
```

環境変数は `.env.local` に保存。`.gitignore` で除外済みのため GitHub には上がらない。
Vercel には Environment Variables として別途設定すること。
