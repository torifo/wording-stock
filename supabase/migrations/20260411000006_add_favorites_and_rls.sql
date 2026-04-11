-- ============================================================
-- お気に入りテーブル追加 & expressions の更新・削除 RLS 追加
-- ============================================================

-- favorites テーブル
CREATE TABLE IF NOT EXISTS favorites (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  expression_id UUID        NOT NULL REFERENCES expressions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, expression_id)
);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_own_select" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_own_insert" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_own_delete" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- expressions: 自分の投稿を更新・削除できる RLS 追加
CREATE POLICY "expressions_own_update"
  ON expressions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "expressions_own_delete"
  ON expressions FOR DELETE
  USING (auth.uid() = user_id);
