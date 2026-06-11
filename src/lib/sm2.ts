/**
 * Spaced-repetition transitions for reminds_me.
 *
 * Lifecycle:
 *   new → (shown in normal mode until display_count hits the test threshold)
 *       → test mode → わかる / わからない:
 *
 * 'know' (わかる):
 *   correct_count += 1
 *   - 1st correct (still learning):  review again in ~1 day
 *   - 2 consecutive corrects:        → 'mastered', review in ~1 week
 *   - already mastered + correct:    stay 'mastered', review in ~1 month
 *   display_count is NOT modified (stays in test mode).
 *
 * 'dont_know' (わからない):
 *   incorrect_count += 1
 *   correct_count = 0      (the consecutive-correct streak resets)
 *   display_count = 0      (back to normal mode — shows the meaning again)
 *   review again very soon (one notification interval) → "出てきやすくなる"
 *
 * Passive show (notification fired, not yet test mode):
 *   display_count += 1
 *
 * NOTE: 'mastered' no longer removes a word — it just gives it a long review
 * interval. The scheduler still surfaces mastered words once they're due.
 */
import type { UserWord, WordStatus } from '../types';

/** Consecutive わかる answers needed to graduate a word to 'mastered'. */
export const MASTER_AFTER_CONSECUTIVE_CORRECT = 2;
/** Review delay (days) the first time a word reaches mastery. */
export const FIRST_MASTERED_REVIEW_DAYS = 7;
/** Review delay (days) for each subsequent correct review of a mastered word. */
export const LATER_MASTERED_REVIEW_DAYS = 30;
/** Review delay (days) after the 1st correct, while still building to mastery. */
export const LEARNING_REVIEW_DAYS = 1;

export interface Sm2Update {
  status: WordStatus;
  display_count: number;
  correct_count: number;
  incorrect_count: number;
  interval_days: number;
  next_display_at: string;
  last_displayed_at: string;
  mastered_at: string | null;
}

function isoFromNowMs(ms: number): string {
  return new Date(Date.now() + ms).toISOString();
}

function minutesToMs(m: number): number {
  return m * 60 * 1000;
}

/** Convert a logical review interval (in days) to milliseconds. */
function reviewDelayMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

export function applyCorrect(userWord: UserWord): Sm2Update {
  const newCorrectCount = userWord.correct_count + 1;
  const wasMastered = userWord.status === 'mastered';

  let status: WordStatus;
  let intervalDays: number;
  if (wasMastered) {
    // Already mastered → stay mastered, push the next review further out.
    status = 'mastered';
    intervalDays = LATER_MASTERED_REVIEW_DAYS;
  } else if (newCorrectCount >= MASTER_AFTER_CONSECUTIVE_CORRECT) {
    // Two consecutive corrects → graduate to mastered.
    status = 'mastered';
    intervalDays = FIRST_MASTERED_REVIEW_DAYS;
  } else {
    // First correct → still learning; confirm again soon.
    status = 'learning';
    intervalDays = LEARNING_REVIEW_DAYS;
  }

  // Record the first moment of mastery; preserve it on later mastered reviews.
  const mastered_at =
    status === 'mastered'
      ? userWord.mastered_at ?? new Date().toISOString()
      : null;

  return {
    status,
    display_count: userWord.display_count, // unchanged (stays test mode)
    correct_count: newCorrectCount,
    incorrect_count: userWord.incorrect_count,
    interval_days: intervalDays,
    next_display_at: isoFromNowMs(reviewDelayMs(intervalDays)),
    last_displayed_at: new Date().toISOString(),
    mastered_at,
  };
}

export function applyIncorrect(
  userWord: UserWord,
  notificationIntervalMin: number
): Sm2Update {
  return {
    status: 'learning',
    display_count: 0, // back to normal mode
    correct_count: 0, // reset the consecutive-correct streak
    incorrect_count: userWord.incorrect_count + 1,
    interval_days: 1,
    next_display_at: isoFromNowMs(minutesToMs(notificationIntervalMin)),
    last_displayed_at: new Date().toISOString(),
    mastered_at: null, // dropped out of mastery
  };
}

/**
 * Passive show of a normal-mode notification — bump display_count toward the
 * test threshold. Mastered words keep their status (their reviews are driven
 * by わかる / わからない, not by passive shows).
 */
export function applyShown(userWord: UserWord): Pick<
  Sm2Update,
  'display_count' | 'last_displayed_at' | 'status'
> {
  return {
    status: userWord.status === 'mastered' ? 'mastered' : 'learning',
    display_count: userWord.display_count + 1,
    last_displayed_at: new Date().toISOString(),
  };
}
