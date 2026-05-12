# Wording Stock

日本語の豊かな表現（四字熟語・慣用句・ことわざ・詩的フレーズなど）を投稿・共有・発見できる SNS。

**🌐 [wordock.riumu.net](https://wordock.riumu.net)**

---

## サービス概要

- 表現を投稿してタイムラインで共有する
- カテゴリ（四字熟語 / 慣用句 / ことわざ / 名言・格言 / 詩・俳句 / その他）で分類・フィルタリングする
- キーワード検索で表現を探せる
- 今日の表現（カテゴリ別）をサイドバー・横スクロールで毎日更新表示
- いいね（押す → 取り消す → 再押し）でお気に入りの表現を評価する
- ブックマーク機能でお気に入りの表現を保存する
- ユーザーアイコン・名前タップで他ユーザーのプロフィール・投稿一覧を閲覧できる
- Web ブラウザ（PWA 対応）と Expo Go (Android/iOS) の両方で利用できる

---

## 技術スタック

| レイヤー | 使用技術 |
|---|---|
| モバイル / Web フロントエンド | React Native (Expo SDK 54) + Expo Router v6 |
| UI コンポーネント | Tamagui v1 |
| バックエンド / DB | Supabase (PostgreSQL + RLS) |
| 認証 | Supabase Auth |
| ストレージ | Supabase Storage（アバター画像） |
| サーバーレス関数 | Supabase Edge Functions（AI コンテンツモデレーション） |
| Web ホスティング | Vercel（静的 SPA）+ 独自ドメイン `wordock.riumu.net` |
| Android 配布 | EAS Build（APK 直接配布 / Play Store）※予定 |

---

## ディレクトリ構成

```
wording-stock/
├── src/
│   ├── app/                    # Expo Router 画面
│   │   ├── _layout.tsx         # ルートレイアウト（TamaguiProvider）
│   │   ├── (tabs)/             # ボトムタブ
│   │   │   ├── index.tsx       # タイムライン（PC レイアウト / モバイル分岐）
│   │   │   └── profile.tsx     # プロフィール（設定・投稿履歴・お気に入り）
│   │   ├── auth/               # 認証画面
│   │   │   ├── login.tsx
│   │   │   └── signup.tsx
│   │   ├── user/
│   │   │   └── [id].tsx        # 他ユーザーのプロフィール・投稿一覧
│   │   └── post.tsx            # 投稿画面（モーダル）
│   ├── components/
│   │   ├── ExpressionCard.tsx  # 投稿カード
│   │   ├── PostForm.tsx        # 投稿フォーム（意味・出典・カテゴリ）
│   │   ├── VoteButtons.tsx     # いいねボタン（debounce・toggle対応）
│   │   ├── DailySection.tsx    # 今日の表現（横スクロール / 縦積み）
│   │   └── GreyLayer.tsx       # グレーアウトオーバーレイ
│   ├── hooks/
│   │   ├── useTimeline.ts      # タイムライン取得・ページネーション
│   │   ├── usePost.ts          # 投稿（クライアントフィルタ + Supabase INSERT）
│   │   ├── useMyPosts.ts       # 自分の投稿一覧・編集・削除
│   │   ├── useFavorites.ts     # お気に入り操作
│   │   ├── useVote.ts          # いいね / unlike
│   │   └── useDailyExpression.ts # 今日の表現（日付ベースハッシュ）
│   ├── context/
│   │   └── AuthContext.tsx     # 認証状態のグローバル管理
│   ├── lib/
│   │   ├── supabase.ts         # Supabase クライアント
│   │   └── clientFilter.ts     # クライアントサイド禁止ワードフィルタ
│   └── types/
│       ├── index.ts            # Expression / Profile / Vote 型
│       └── database.ts         # Supabase 自動生成型（DB スキーマ）
├── supabase/
│   ├── migrations/             # DB マイグレーション SQL（7本）
│   └── functions/
│       └── ai-checker/         # Edge Function（マルチプロバイダー AI モデレーション）
├── assets/                     # アイコン・スプラッシュ画像
├── docs/
│   ├── deployment.md           # デプロイ手順（Vercel / Supabase / APK / Play Store）
│   ├── moderation-setup.md     # AI モデレーション API 取得・設定手順
│   └── troubleshooting.md      # セットアップ時のトラブル記録
├── app.json                    # Expo 設定・PWA マニフェスト（themeColor: #BC002D）
├── eas.json                    # EAS Build プロファイル
├── vercel.json                 # Vercel SPA リライト設定
└── netlify.toml                # Netlify デプロイ設定（代替オプション）
```

---

## ローカル開発

```bash
# 依存関係インストール
npm install --legacy-peer-deps

# 環境変数を設定（.env.example をコピーして編集）
cp .env.example .env.local

# 開発サーバー起動
npm start -- --clear
```

`.env.local` に設定する値：

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_WEB_URL=http://localhost:8081
```

詳細は `docs/deployment.md` を参照。

---

## デプロイ構成

```
git push origin main
  ↓ Vercel auto-deploy
npx expo export -p web --output-dir dist
  ↓
https://wordock.riumu.net
```

- **Vercel 環境変数**: `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Supabase Auth**: Site URL = `https://wordock.riumu.net`、Redirect URLs = `https://wordock.riumu.net/**`

## Google ログイン設定

`src/app/auth/login.tsx` と `src/app/auth/signup.tsx` から `Supabase Auth` の Google OAuth を開始し、`/auth/callback` で `code` をセッション交換します。

### 1. Supabase Dashboard

- `Authentication` → `Providers` → `Google` を有効化
- Google Cloud で発行した `Client ID` と `Client Secret` を設定
- `Authentication` → `Sign In / Providers` で `Manual linking` を有効化
- `Authentication` → `URL Configuration` を次のように設定

Site URL:
`https://wordock.riumu.net`

Redirect URLs:
- `https://wordock.riumu.net/auth/callback`
- `http://localhost:8081/auth/callback`
- `wordingstock://auth/callback`

### 2. Google Cloud Console

OAuth クライアントの種類は `Web application` を使います。

承認済みの JavaScript 生成元:
- `https://wordock.riumu.net`
- `http://localhost:8081`

承認済みのリダイレクト URI:
- `https://<your-project-ref>.supabase.co/auth/v1/callback`

補足:
- Supabase Hosted を使う場合、Google Cloud Console 側の redirect URI は通常 1 つで、アプリの本番 URL や `localhost` はここには入れません。
- 本番 URL / 開発 URL の切り分けは、Google Cloud Console の `JavaScript 生成元` と、Supabase 側の `Redirect URLs` に入れて管理します。
- ローカル Supabase を使う場合だけ、追加で `http://127.0.0.1:54321/auth/v1/callback` を Google Cloud Console に登録します。
- メール登録済みユーザーがプロフィール画面から Google を連携する機能は、Supabase の `Manual linking` が無効だと動きません。

---

## ライセンス

MIT
