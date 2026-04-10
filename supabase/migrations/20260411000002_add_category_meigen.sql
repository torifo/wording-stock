-- カテゴリに「名言・格言」を追加
ALTER TABLE expressions
  DROP CONSTRAINT IF EXISTS expressions_category_check;

ALTER TABLE expressions
  ADD CONSTRAINT expressions_category_check
  CHECK (category IN ('四字熟語','慣用句','ことわざ','詩・俳句','名言・格言','その他'));
