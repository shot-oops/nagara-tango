export type Plan = 'free' | 'paid';

export type WordStatus = 'new' | 'learning' | 'known' | 'mastered';

/** What kind of notification fired (recorded in notification logs). */
export type NotificationType = 'normal' | 'test';

export type NotificationResult = 'correct' | 'incorrect' | 'shown';

export interface NotificationBlock {
  start: number; // 0-23
  end: number;   // 0-23
}

/** A "notify around this time of day" slot (mikan-style settings). */
export interface NotificationSlot {
  id: string;
  emoji: string;
  label: string;
  hour: number; // 0-23
  minute: number; // 0-59
  enabled: boolean;
}

/**
 * Per-user app settings stored in AsyncStorage.
 * `plan` is appended for the RevenueCat cache (source of truth = RevenueCat).
 */
export interface Profile {
  plan: Plan;
  notification_interval_min: number;
  notification_blocks: NotificationBlock[];
  daily_new_words: number;
  onboarding_completed: boolean;
  /** Whether the user reported prior TOEIC experience (onboarding). */
  toeic_experience: boolean | null;
  /** Self-reported recent TOEIC score, if any. */
  toeic_score: number | null;
  /** Time-of-day slots the user wants notifications around. */
  notification_slots: NotificationSlot[];
}

/**
 * Per-word learning state. Stored in AsyncStorage as
 *   { "<word_id>": UserWord, ... }
 */
export interface UserWord {
  word_id: string;
  status: WordStatus;
  display_count: number;
  correct_count: number;
  incorrect_count: number;
  next_display_at: string; // ISO
  interval_days: number;
  last_displayed_at: string | null;
  created_at: string;
  /** When the word first reached 'mastered' (ISO), else null. Used for stats. */
  mastered_at: string | null;
}

export interface NotificationLog {
  id: string;
  word_id: string;
  type: NotificationType;
  result: NotificationResult | null;
  notified_at: string;
}

// ============================================================
// Vocabulary master (Supabase-backed, TOEIC-only)
// ============================================================

export type Difficulty = 2 | 3 | 4 | 5;
/** TOEIC vocabulary levels — minimum 2 (no Level 1 in TOEIC pivot). */
export type VocabLevel = 2 | 3 | 4 | 5;
export type LevelTier = 'beginner' | 'intermediate' | 'advanced';

export interface MasterWord {
  id: string;
  english: string;
  japanese: string;
  difficulty_level: Difficulty;
  example_en: string | null;
  example_jp: string | null;
}

export interface VocabTestQuestion {
  word: MasterWord;
  tier: LevelTier;
  choices: string[];
  correctIndex: number;
}

export interface VocabTestAnswer {
  wordId: string;
  tier: LevelTier;
  correct: boolean;
}

export interface VocabTestResult {
  score: number;
  level: VocabLevel;
  answers: VocabTestAnswer[];
  completed_at: string;
}

/** TOEIC score-band label for a vocabulary level. */
export const TOEIC_LEVEL_LABEL: Record<VocabLevel, string> = {
  2: '500点レベル',
  3: '700点レベル',
  4: '860点レベル',
  5: '990点レベル',
};
