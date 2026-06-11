import { useCallback, useEffect, useState } from 'react';
import { getNextWord } from '../lib/wordSelector';
import { getAllWords } from '../lib/wordRepository';
import { getUserWordsMap, getVocabTestResult } from '../lib/storage';
import type { MasterWord, VocabLevel } from '../types';

interface UseWordSelectorArgs {
  /** Override the persisted vocab-test level (rare). */
  levelOverride?: VocabLevel;
}

interface UseWordSelectorReturn {
  loading: boolean;
  pool: MasterWord[];
  level: VocabLevel;
  pickNext: () => Promise<MasterWord | null>;
  refresh: () => Promise<void>;
}

const DEFAULT_LEVEL: VocabLevel = 2;

export function useWordSelector(
  args: UseWordSelectorArgs = {}
): UseWordSelectorReturn {
  const { levelOverride } = args;
  const [pool, setPool] = useState<MasterWord[]>([]);
  const [level, setLevel] = useState<VocabLevel>(
    levelOverride ?? DEFAULT_LEVEL
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [words, result] = await Promise.all([
        getAllWords().catch((e) => {
          console.error('[useWordSelector] getAllWords failed', e);
          return [] as MasterWord[];
        }),
        getVocabTestResult().catch((e) => {
          console.warn('[useWordSelector] getVocabTestResult failed', e);
          return null;
        }),
      ]);
      setPool(Array.isArray(words) ? words : []);
      if (levelOverride !== undefined) {
        setLevel(levelOverride);
      } else if (result && typeof result.level === 'number') {
        setLevel(result.level);
      } else {
        setLevel(DEFAULT_LEVEL);
      }
    } catch (e) {
      console.error('[useWordSelector] load failed', e);
      setPool([]);
      setLevel(levelOverride ?? DEFAULT_LEVEL);
    } finally {
      setLoading(false);
    }
  }, [levelOverride]);

  useEffect(() => {
    load();
  }, [load]);

  const pickNext = useCallback(async (): Promise<MasterWord | null> => {
    if (pool.length === 0) return null;
    const userWords = await getUserWordsMap();
    return getNextWord({ pool, userWords, level });
  }, [pool, level]);

  return { loading, pool, level, pickNext, refresh: load };
}
