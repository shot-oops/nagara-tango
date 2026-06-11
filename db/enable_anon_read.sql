-- ============================================================
-- Grant anon (public, app-side) read access to `words`.
-- Without this, RLS silently returns 0 rows to the app even though
-- service_role inserted them successfully.
-- ============================================================

ALTER TABLE words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read words" ON words;
CREATE POLICY "public read words" ON words
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Verify the policy applied: should now return 1000 (or whatever you imported)
SELECT COUNT(*) AS visible_to_anon FROM words;
