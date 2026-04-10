-- ============================================================
-- handle_new_user トリガー修正
-- username は NOT NULL のため、UUID 先頭8文字からデフォルト値を生成する
-- ユーザーは後からプロフィール編集で変更可能
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, 'user_' || substr(NEW.id::text, 1, 8));
  RETURN NEW;
END;
$$;
