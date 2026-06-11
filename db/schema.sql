-- ============================================================
-- reminds_me: master schema
--   tags / words / word_tags / user_words
-- Run this in the Supabase SQL Editor.
-- Word/tag inserts are handled separately (see seeds/ or ingest script).
-- ============================================================

CREATE TABLE IF NOT EXISTS tags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  display_order integer
);

INSERT INTO tags (name, category, display_order) VALUES
  ('共通テスト', 'university', 1),
  ('TOEIC_400', 'toeic', 2),
  ('TOEIC_600', 'toeic', 3),
  ('TOEIC_800', 'toeic', 4),
  ('英検2級', 'eiken', 5),
  ('英検1級', 'eiken', 6)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS words (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  english text NOT NULL UNIQUE,
  japanese text NOT NULL,
  difficulty_level integer NOT NULL CHECK (difficulty_level BETWEEN 1 AND 5),
  example_en text,
  example_jp text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS word_tags (
  word_id uuid REFERENCES words(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  is_diagnostic boolean DEFAULT false,
  PRIMARY KEY (word_id, tag_id)
);

CREATE TABLE IF NOT EXISTS user_words (
  device_id text NOT NULL,
  word_id uuid REFERENCES words(id) ON DELETE CASCADE,
  status text DEFAULT 'new',
  display_count integer DEFAULT 0,
  correct_count integer DEFAULT 0,
  incorrect_count integer DEFAULT 0,
  interval_days numeric DEFAULT 1,
  next_display_at timestamptz DEFAULT now(),
  last_displayed_at timestamptz,
  PRIMARY KEY (device_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_user_words_next ON user_words(device_id, next_display_at);
CREATE INDEX IF NOT EXISTS idx_word_tags_tag ON word_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_words_difficulty ON words(difficulty_level);

-- ============================================================
-- RLS policies
--   • words / tags : public read for anon (app fetches via anon key)
--                    writes restricted to service_role only
--   • user_words   : NOT exposed via anon — RLS stays default-deny.
--                    (App uses local AsyncStorage; sync layer comes later.)
-- ============================================================

ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read words" ON words;
CREATE POLICY "public read words" ON words FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "public read tags" ON tags;
CREATE POLICY "public read tags" ON tags FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "public read word_tags" ON word_tags;
CREATE POLICY "public read word_tags" ON word_tags FOR SELECT TO anon USING (true);

-- ============================================================
-- Reference: how to seed words + tag assignments (run elsewhere)
-- ============================================================
-- INSERT INTO words (english, japanese, difficulty_level)
-- VALUES ('alternative', '代わりの・代替の', 3)
-- ON CONFLICT (english) DO NOTHING;
--
-- INSERT INTO word_tags (word_id, tag_id, is_diagnostic)
-- SELECT w.id, t.id, false
-- FROM words w, tags t
-- WHERE w.english = 'alternative'
--   AND t.name IN ('共通テスト','TOEIC_600','英検2級')
-- ON CONFLICT DO NOTHING;
--
-- Diagnostic flagging (per tag, 30 words: 10 from d1-2, 10 from d3, 10 from d4-5):
-- UPDATE word_tags wt SET is_diagnostic = true
-- WHERE (word_id, tag_id) IN (
--   SELECT wt2.word_id, wt2.tag_id
--   FROM word_tags wt2
--   JOIN words w ON w.id = wt2.word_id
--   JOIN tags t ON t.id = wt2.tag_id
--   WHERE t.name = '共通テスト' AND w.difficulty_level BETWEEN 1 AND 2
--   ORDER BY random() LIMIT 10
-- );
