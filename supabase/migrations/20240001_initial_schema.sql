-- ============================================================
-- Wording-Stock: 初期スキーマ
-- ============================================================

-- ---- ENUM 型 ----
CREATE TYPE censor_status AS ENUM ('safe', 'grey', 'banned');
CREATE TYPE vote_type AS ENUM ('appropriate', 'inappropriate');


-- ============================================================
-- テーブル: profiles
-- ============================================================
CREATE TABLE profiles (
  id                  UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT        NOT NULL UNIQUE
                                  CHECK (char_length(username) BETWEEN 1 AND 30),
  favorite_yojijukugo TEXT        CHECK (char_length(favorite_yojijukugo) = 4),
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles_own_update"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);


-- ============================================================
-- テーブル: expressions
-- ============================================================
CREATE TABLE expressions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID          NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT          NOT NULL
                              CHECK (char_length(content) BETWEEN 1 AND 280),
  category      TEXT          NOT NULL
                              CHECK (category IN ('四字熟語','慣用句','ことわざ','詩・俳句','その他')),
  censor_status censor_status NOT NULL DEFAULT 'safe',
  is_ai_checked BOOLEAN       NOT NULL DEFAULT FALSE,
  visibility    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- タイムライン用インデックス（visibility = TRUE の投稿を created_at 降順で効率取得）
CREATE INDEX idx_expressions_timeline
  ON expressions (created_at DESC)
  WHERE visibility = TRUE;

-- AI キュー用インデックス（未判定の投稿を created_at 昇順で効率取得）
CREATE INDEX idx_expressions_ai_queue
  ON expressions (created_at ASC)
  WHERE is_ai_checked = FALSE;

-- RLS
ALTER TABLE expressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expressions_public_read_visible"
  ON expressions FOR SELECT
  USING (visibility = TRUE);

CREATE POLICY "expressions_own_insert"
  ON expressions FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- テーブル: votes
-- ============================================================
CREATE TABLE votes (
  id            UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  expression_id UUID      NOT NULL REFERENCES expressions(id) ON DELETE CASCADE,
  user_id       UUID      NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  vote_type     vote_type NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (expression_id, user_id)   -- 重複投票防止
);

-- RLS
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes_own_insert"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_public_read"
  ON votes FOR SELECT
  USING (true);
