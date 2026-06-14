import { getAllWords } from './wordRepository';
import {
  bulkSetUserWords,
  getTodaySupplementedCount,
  getUserWordsMap,
  getVocabTestResult,
  makeNewUserWord,
  recordSupplemented,
} from './storage';
import { bucketOf, pickWeighted, weightsForLevel } from './wordSelector';
import type { MasterWord, UserWord, VocabLevel } from '../types';

/** Falls back to the lowest TOEIC level if no diagnostic result is stored. */
const DEFAULT_LEVEL: VocabLevel = 2;

/**
 * Pick `n` distinct untouched words honouring the level's difficulty
 * distribution (7:2:1, or 8:2 at the level boundaries — see weightsForLevel).
 * Falls back to any remaining untouched word when the drawn bucket is empty,
 * so a starved difficulty band never blocks supplementation.
 */
function pickDistinctWeighted(
  untouched: MasterWord[],
  level: VocabLevel,
  n: number
): MasterWord[] {
  const chosen: MasterWord[] = [];
  const used = new Set<string>();
  const weights = weightsForLevel(level);
  // Bound the loop: a near-empty target bucket could otherwise spin.
  const maxGuard = n * 20 + 10;
  let guard = 0;

  while (chosen.length < n && used.size < untouched.length && guard < maxGuard) {
    guard += 1;
    const bucket = pickWeighted(weights);
    let candidates = untouched.filter(
      (w) => !used.has(w.id) && bucketOf(w.difficulty_level, level) === bucket
    );
    if (candidates.length === 0) {
      candidates = untouched.filter((w) => !used.has(w.id));
    }
    if (candidates.length === 0) break;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    used.add(pick.id);
    chosen.push(pick);
  }
  return chosen;
}

/**
 * Core: add up to `count` brand-new (status='new', due now) words from the
 * untouched master pool, weighted by the user's level. Returns the number
 * actually added. No-ops when the pool is empty or fully consumed.
 */
async function addNewWords(count: number): Promise<number> {
  if (!Number.isFinite(count) || count <= 0) return 0;

  const [master, userWords, result] = await Promise.all([
    getAllWords().catch(() => [] as MasterWord[]),
    getUserWordsMap().catch(() => ({}) as Record<string, UserWord>),
    getVocabTestResult().catch(() => null),
  ]);
  if (!Array.isArray(master) || master.length === 0) return 0;

  const level: VocabLevel =
    result && typeof result.level === 'number' ? result.level : DEFAULT_LEVEL;

  // Untouched = master words with no user_words entry yet.
  const untouched = master.filter((w) => w && w.id && !userWords[w.id]);
  if (untouched.length === 0) return 0;

  const toAdd = Math.min(Math.floor(count), untouched.length);
  const picks = pickDistinctWeighted(untouched, level, toAdd);
  if (picks.length === 0) return 0;

  const newWords: UserWord[] = picks.map((w) =>
    makeNewUserWord(w.id, { status: 'new' })
  );
  await bulkSetUserWords(newWords);
  return newWords.length;
}

/**
 * Top up today's pool of new words toward the daily quota. Idempotent within a
 * day via the per-day counter (storage.recordSupplemented): repeated calls only
 * ever add up to `dailyNewWords` total for the day.
 */
export async function supplementNewWords(
  dailyNewWords: number
): Promise<number> {
  const quota = Number.isFinite(dailyNewWords)
    ? Math.max(0, Math.floor(dailyNewWords))
    : 0;
  if (quota <= 0) return 0;

  const alreadyToday = await getTodaySupplementedCount();
  const remaining = quota - alreadyToday;
  if (remaining <= 0) return 0;

  const added = await addNewWords(remaining);
  if (added > 0) await recordSupplemented(added);
  return added;
}
