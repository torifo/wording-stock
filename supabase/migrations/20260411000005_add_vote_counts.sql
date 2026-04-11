-- ============================================================
-- expressions テーブルに投票集計カラムを追加し、
-- votes の INSERT / DELETE で自動更新するトリガーを設定する
-- ============================================================

-- 集計カラム追加
ALTER TABLE expressions
  ADD COLUMN IF NOT EXISTS appropriate_count   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inappropriate_count INTEGER NOT NULL DEFAULT 0;

-- 既存 votes データをバックフィル
UPDATE expressions e
SET
  appropriate_count = (
    SELECT COUNT(*) FROM votes v
    WHERE v.expression_id = e.id AND v.vote_type = 'appropriate'
  ),
  inappropriate_count = (
    SELECT COUNT(*) FROM votes v
    WHERE v.expression_id = e.id AND v.vote_type = 'inappropriate'
  );

-- トリガー関数
CREATE OR REPLACE FUNCTION update_vote_counts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'appropriate' THEN
      UPDATE expressions SET appropriate_count   = appropriate_count   + 1 WHERE id = NEW.expression_id;
    ELSE
      UPDATE expressions SET inappropriate_count = inappropriate_count + 1 WHERE id = NEW.expression_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'appropriate' THEN
      UPDATE expressions SET appropriate_count   = GREATEST(appropriate_count   - 1, 0) WHERE id = OLD.expression_id;
    ELSE
      UPDATE expressions SET inappropriate_count = GREATEST(inappropriate_count - 1, 0) WHERE id = OLD.expression_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- vote_type 変更時（appropriate ⇔ inappropriate の切り替え）
    IF OLD.vote_type = 'appropriate' THEN
      UPDATE expressions SET appropriate_count   = GREATEST(appropriate_count   - 1, 0) WHERE id = OLD.expression_id;
    ELSE
      UPDATE expressions SET inappropriate_count = GREATEST(inappropriate_count - 1, 0) WHERE id = OLD.expression_id;
    END IF;
    IF NEW.vote_type = 'appropriate' THEN
      UPDATE expressions SET appropriate_count   = appropriate_count   + 1 WHERE id = NEW.expression_id;
    ELSE
      UPDATE expressions SET inappropriate_count = inappropriate_count + 1 WHERE id = NEW.expression_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- トリガー登録（既存があれば置き換え）
DROP TRIGGER IF EXISTS trg_vote_counts ON votes;
CREATE TRIGGER trg_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_vote_counts();
