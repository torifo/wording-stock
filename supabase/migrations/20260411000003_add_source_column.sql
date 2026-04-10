-- expressions テーブルに出典情報カラムを追加
-- ユーザー投稿は NULL、シードデータには出典を記録する
ALTER TABLE expressions
  ADD COLUMN IF NOT EXISTS source_name TEXT,
  ADD COLUMN IF NOT EXISTS source_url  TEXT;
