-- expressions テーブルに meaning（意味・説明）カラムを追加
ALTER TABLE expressions
  ADD COLUMN IF NOT EXISTS meaning TEXT
    CHECK (meaning IS NULL OR char_length(meaning) <= 500);
