-- ============================================================
-- Wording-Stock: トリガー・関数
-- ============================================================

-- ============================================================
-- プロフィール自動生成トリガー
-- 新規ユーザー登録時に profiles レコードを自動生成する
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- ModerationHook トリガー
-- votes テーブルへの INSERT 後に不適切票数を集計し、
-- 10 票以上に達した場合は expression を banned・非表示にする
-- ============================================================
CREATE OR REPLACE FUNCTION moderation_hook()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  inappropriate_count INT;
BEGIN
  -- 否決票数を集計
  SELECT COUNT(*) INTO inappropriate_count
  FROM votes
  WHERE expression_id = NEW.expression_id
    AND vote_type = 'inappropriate';

  -- 10 票以上で非表示・banned に更新
  IF inappropriate_count >= 10 THEN
    UPDATE expressions
    SET visibility    = FALSE,
        censor_status = 'banned'
    WHERE id = NEW.expression_id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- エラーをログに記録し、状態を変更せず処理を終了
  RAISE LOG 'moderation_hook error for expression %: %',
    NEW.expression_id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_vote_insert
  AFTER INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION moderation_hook();


-- ============================================================
-- updated_at 自動更新トリガー
-- profiles の updated_at を自動更新する
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
