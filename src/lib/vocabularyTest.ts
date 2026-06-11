import { getSupabase } from './supabase';
import { getAllWords } from './wordRepository';
import type {
  Difficulty,
  LevelTier,
  MasterWord,
  VocabLevel,
  VocabTestAnswer,
  VocabTestQuestion,
} from '../types';

export const BLOCK_SIZE = 10;
export const TOTAL_QUESTIONS = 30;

/**
 * Fetch the diagnostic word pool. With the TOEIC-only pivot we just return
 * the entire master pool — block-level tier sampling is done downstream.
 */
export async function getDiagnosticWords(): Promise<MasterWord[]> {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('Supabase not initialized');
    return [];
  }
  try {
    // 診断用単語（is_diagnostic = true）だけを取得
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('is_diagnostic', true);
    
    if (error) {
      console.error('[vocabTest] Supabase error:', error);
      return [];
    }

    if (!data || !Array.isArray(data)) return [];
    return data.filter((w) => w && typeof w === 'object' && w.id);
  } catch (err) {
    console.error('[vocabTest] getDiagnosticWords error', err);
    return [];
  }
}

const TIER_WEIGHT: Record<LevelTier, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
};

const TIER_ORDER: LevelTier[] = ['beginner', 'intermediate', 'advanced'];

export function difficultyToTier(d: Difficulty): LevelTier {
  if (d <= 2) return 'beginner';
  if (d === 3) return 'intermediate';
  return 'advanced';
}

export function tierForBlock(
  blockIndex: 0 | 1 | 2,
  prevCorrectCounts: number[]
): LevelTier {
  if (blockIndex === 0) return 'intermediate';
  const prev = prevCorrectCounts[blockIndex - 1] ?? 0;
  if (blockIndex === 1) {
    if (prev >= 8) return 'advanced';
    if (prev <= 3) return 'beginner';
    return 'intermediate';
  }
  const prevTier = tierForBlock(1, prevCorrectCounts);
  const idx = TIER_ORDER.indexOf(prevTier);
  if (prev >= 7) return TIER_ORDER[Math.min(idx + 1, TIER_ORDER.length - 1)];
  if (prev <= 3) return TIER_ORDER[Math.max(idx - 1, 0)];
  return prevTier;
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function selectBlockWords(
  tier: LevelTier,
  pool: MasterWord[],
  used: Set<string>,
  count: number
): MasterWord[] {
  if (!Array.isArray(pool) || pool.length === 0) return [];
  const safeUsed = used instanceof Set ? used : new Set<string>();
  const available = pool.filter(
    (w) => w && w.id && !safeUsed.has(w.id)
  );
  const inTier = available.filter(
    (w) => difficultyToTier(w.difficulty_level) === tier
  );

  let chosen = shuffle(inTier).slice(0, count);
  if (chosen.length === count) return chosen;

  const remainder = shuffle(
    available.filter((w) => !chosen.find((c) => c.id === w.id))
  ).slice(0, count - chosen.length);
  chosen = chosen.concat(remainder);
  return chosen;
}

/**
 * Pick `count` distractor words for a multiple-choice question.
 *   1. exclude the correct word + any ids in `excludeIds` (e.g. the diagnostic
 *      set, or the current review list) so "I just saw it" can't be the tell.
 *   2. prefer words within ±1 difficulty of the correct word.
 *   3. random; falls back to wider difficulty only if too few candidates.
 */
export function pickDistractors(
  correct: MasterWord,
  pool: MasterWord[],
  excludeIds?: Set<string>,
  count = 3
): MasterWord[] {
  const safePool = Array.isArray(pool) ? pool : [];
  const base = safePool.filter(
    (w) =>
      w &&
      w.id &&
      w.japanese &&
      w.id !== correct.id &&
      w.japanese !== correct.japanese &&
      (!excludeIds || !excludeIds.has(w.id))
  );
  const near = base.filter(
    (w) => Math.abs(w.difficulty_level - correct.difficulty_level) <= 1
  );
  let chosen = shuffle(near).slice(0, count);
  if (chosen.length < count) {
    const chosenIds = new Set(chosen.map((c) => c.id));
    const rest = shuffle(base.filter((w) => !chosenIds.has(w.id))).slice(
      0,
      count - chosen.length
    );
    chosen = chosen.concat(rest);
  }
  return chosen;
}

export function buildQuestion(
  word: MasterWord,
  distractorPool: MasterWord[],
  excludeIds?: Set<string>
): VocabTestQuestion {
  const distractors = pickDistractors(word, distractorPool, excludeIds, 3);

  const all = [word.japanese, ...distractors.map((d) => d.japanese)];
  while (all.length < 4) all.push('—');
  const shuffled = shuffle(all);
  return {
    word,
    tier: difficultyToTier(word.difficulty_level),
    choices: shuffled,
    correctIndex: shuffled.indexOf(word.japanese),
  };
}

export function scoreFromAnswers(answers: VocabTestAnswer[]): number {
  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return 0;
  }
  let total = 0;
  for (const a of answers) {
    if (!a || typeof a !== 'object') continue;
    const weight = TIER_WEIGHT[a.tier];
    if (a.correct && typeof weight === 'number') total += weight;
  }
  return total;
}

/**
 * Maps a raw weighted score to a TOEIC vocabulary level.
 * Floor is 2 — no Level 1 in the TOEIC pivot (no d=1 words exist).
 */
export function levelFromScore(score: number): VocabLevel {
  if (score <= 25) return 2;
  if (score <= 40) return 3;
  if (score <= 54) return 4;
  return 5;
}

export function correctCountsByBlock(answers: VocabTestAnswer[]): number[] {
  const counts: number[] = [];
  for (let b = 0; b * BLOCK_SIZE < answers.length; b += 1) {
    const slice = answers.slice(b * BLOCK_SIZE, (b + 1) * BLOCK_SIZE);
    counts.push(slice.filter((a) => a.correct).length);
  }
  return counts;
}
