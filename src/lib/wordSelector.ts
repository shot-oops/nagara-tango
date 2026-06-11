import type { Difficulty, MasterWord, UserWord, VocabLevel } from '../types';

const MIN_POOL_BEFORE_FALLBACK = 10;

export type Bucket = 'fit' | 'lower' | 'higher';

export interface WeightedPick {
  bucket: Bucket;
  weight: number;
}

export function weightsForLevel(level: VocabLevel): WeightedPick[] {
  if (!level || typeof level !== 'number') {
    return [
      { bucket: 'fit', weight: 0.7 },
      { bucket: 'lower', weight: 0.2 },
      { bucket: 'higher', weight: 0.1 },
    ];
  }
  // Level 2 is the lowest in TOEIC pivot — no "lower" bucket.
  if (level === 2) {
    return [
      { bucket: 'fit', weight: 0.8 },
      { bucket: 'higher', weight: 0.2 },
    ];
  }
  // Level 5 is the highest — no "higher" bucket.
  if (level === 5) {
    return [
      { bucket: 'fit', weight: 0.8 },
      { bucket: 'lower', weight: 0.2 },
    ];
  }
  return [
    { bucket: 'fit', weight: 0.7 },
    { bucket: 'lower', weight: 0.2 },
    { bucket: 'higher', weight: 0.1 },
  ];
}

export function bucketOf(diff: Difficulty, level: VocabLevel): Bucket {
  if (diff === level) return 'fit';
  return diff < level ? 'lower' : 'higher';
}

export function pickWeighted(weights: WeightedPick[]): Bucket {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w.bucket;
  }
  return weights[weights.length - 1].bucket;
}

function pickRandom<T>(arr: T[]): T | null {
  if (arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

interface GetNextWordArgs {
  pool: MasterWord[];
  userWords: Record<string, UserWord>;
  level: VocabLevel;
  now?: Date;
}

/**
 * Word selection with priorities:
 *   1. Any user_word whose next_display_at <= now (forgetting-curve due).
 *   2. Otherwise weighted random over difficulty buckets (7:2:1, or 8:2 at
 *      the level boundaries). If the chosen bucket has fewer than 10
 *      candidates, fall back to a uniform pick from the whole untouched pool.
 *   3. Returns null only when every avenue is empty.
 */
export function getNextWord(args: GetNextWordArgs): MasterWord | null {
  if (!args || typeof args !== 'object') {
    console.warn('[wordSelector] getNextWord called with invalid args', args);
    return null;
  }
  const { pool, level } = args;
  const now = args.now ?? new Date();

  if (!level || level < 2 || level > 5) {
    console.warn('[wordSelector] Invalid user level provided to getNextWord:', level);
    return null;
  }
  // Defensive pool sanitization: drop falsy entries and entries with no id.
  const safePool = (Array.isArray(pool) ? pool : []).filter(
    (w) => w && typeof w === 'object' && w.id
  );
  if (safePool.length === 0) return null;

  const userWords =
    args.userWords && typeof args.userWords === 'object'
      ? args.userWords
      : {};

  // --- Priority 1: due reviews -----------------------------------------
  // Guard before `for...in`: the right-hand operand MUST be an object,
  // otherwise the runtime throws "right operand of 'in' is not an object".
  const dueIds: string[] = [];
  if (userWords && typeof userWords === 'object') {
    for (const id in userWords) {
      if (!Object.prototype.hasOwnProperty.call(userWords, id)) continue;
      const uw = userWords[id];
      if (!uw || typeof uw !== 'object') continue;
      if (uw.status === 'mastered') continue;
      const nextAt = new Date(uw.next_display_at);
      if (Number.isFinite(nextAt.getTime()) && nextAt.getTime() <= now.getTime()) {
        dueIds.push(id);
      }
    }
  }
  if (dueIds.length > 0) {
    // Earliest due first.
    dueIds.sort((a, b) => {
      const ua = userWords[a]!.next_display_at;
      const ub = userWords[b]!.next_display_at;
      return ua < ub ? -1 : 1;
    });
    for (const id of dueIds) {
      const w = safePool.find((m) => m.id === id);
      if (w) return w;
    }
  }

  // --- Priority 2: untouched (or non-mastered) words via weighted draw --
  return selectWordByWeights(safePool, userWords, level);
}

/**
 * Weighted bucket draw with pool-exhaustion fallback. Extracted so the input
 * can be re-sanitized defensively at every entry.
 */
function selectWordByWeights(
  wordPool: MasterWord[],
  userWords: Record<string, UserWord>,
  level: VocabLevel
): MasterWord | null {
  wordPool = (wordPool || []).filter((w) => w && w.id);
  if (!wordPool || wordPool.length === 0) return null;

  const untouched = wordPool.filter((w) => {
    const uw = userWords[w.id];
    return !uw || uw.status === 'new';
  });
  if (untouched.length === 0) return null;

  const weights = weightsForLevel(level);
  const bucket = pickWeighted(weights);
  const target = untouched.filter(
    (w) => bucketOf(w.difficulty_level, level) === bucket
  );

  if (target.length >= MIN_POOL_BEFORE_FALLBACK) {
    return pickRandom(target);
  }
  return pickRandom(untouched);
}
