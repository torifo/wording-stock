# Wording Stock

日本語の豊かな表現（四字熟語・慣用句・ことわざ・詩的フレーズなど）を投稿・共有・発見できる SNS。

---

## サービス概要

- 表現を投稿してタイムラインで共有する
- カテゴリ（四字熟語 / 慣用句 / ことわざ / 詩・俳句 / その他）で分類する
- ユーザー同士が「適切 / 不適切」の投票でコンテンツをモデレーションする
- Web ブラウザ（PWA）と Android アプリの両方で利用できる

---

## 技術スタック

| レイヤー | 使用技術 |
|---|---|
| モバイル / Web フロントエンド | React Native (Expo SDK 54) + Expo Router v6 |
| UI コンポーネント | Tamagui v1 |
| バックエンド / DB | Supabase (PostgreSQL + RLS) |
| 認証 | Supabase Auth |
| ストレージ | Supabase Storage（アバター画像） |
| サーバーレス関数 | Supabase Edge Functions（AI モデレーション） |
| Web ホスティング | Vercel（静的 SPA） |
| Android 配布 | EAS Build（APK 直接配布 / Play Store） |

---

## ディレクトリ構成

```
wording-stock/
├── src/
│   ├── app/                    # Expo Router 画面
│   │   ├── _layout.tsx         # ルートレイアウト（TamaguiProvider）
│   │   ├── (tabs)/             # ボトムタブ（タイムライン・プロフィール）
│   │   ├── auth/               # 認証画面（ログイン・新規登録）
│   │   └── post.tsx            # 投稿画面
│   ├── components/             # 再利用可能コンポーネント
│   │   ├── ExpressionCard.tsx  # 投稿カード
│   │   ├── PostForm.tsx        # 投稿フォーム
│   │   ├── VoteButtons.tsx     # 投票ボタン
│   │   └── GreyLayer.tsx       # グレーアウトオーバーレイ
│   ├── context/
│   │   └── AuthContext.tsx     # 認証状態のグローバル管理
│   └── lib/
│       └── supabase.ts         # Supabase クライアント
├── supabase/
│   ├── migrations/             # DB マイグレーション SQL
│   └── functions/
│       └── ai-checker/         # Edge Function（AI モデレーション）
├── assets/                     # アイコン・スプラッシュ画像
├── docs/                       # 詳細ドキュメント
│   ├── deployment.md           # デプロイ手順（Vercel / Supabase / APK / Play Store）
│   └── troubleshooting.md      # トラブルシューティング記録
├── app.json                    # Expo 設定・PWA マニフェスト
├── eas.json                    # EAS Build プロファイル
├── vercel.json                 # Vercel デプロイ設定
└── tamagui.config.ts           # テーマ設定（日の丸カラー）
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
```

詳細は `docs/deployment.md` を参照。

---

## ライセンス

Private
