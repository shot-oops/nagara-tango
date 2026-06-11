-- ============================================================
-- Flag 30 diagnostic words: 10 from each tier of difficulty.
--   beginner     = difficulty 2          (600点レベル)
--   intermediate = difficulty 3          (730点レベル)
--   advanced     = difficulty 4 or 5     (860/990点レベル)
-- Run this once AFTER the CSV import has finished.
-- Re-running it reshuffles which 30 words are diagnostic.
-- ============================================================

UPDATE words SET is_diagnostic = false WHERE is_diagnostic = true;

UPDATE words SET is_diagnostic = true
WHERE id IN (
  SELECT id FROM words WHERE difficulty_level = 2 ORDER BY random() LIMIT 10
);

UPDATE words SET is_diagnostic = true
WHERE id IN (
  SELECT id FROM words WHERE difficulty_level = 3 ORDER BY random() LIMIT 10
);

UPDATE words SET is_diagnostic = true
WHERE id IN (
  SELECT id FROM words WHERE difficulty_level IN (4, 5) ORDER BY random() LIMIT 10
);

-- Verify
SELECT difficulty_level, COUNT(*) AS n
FROM words
WHERE is_diagnostic = true
GROUP BY difficulty_level
ORDER BY difficulty_level;
-- expected: 2→10, 3→10, 4+5→10 (total 30)
