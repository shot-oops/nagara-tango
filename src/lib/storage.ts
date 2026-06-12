import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  NotificationLog,
  Profile,
  UserWord,
  VocabLevel,
  VocabTestResult,
} from '../types';

const KEY_PROFILE = '@reminds_me/profile/v1';
const KEY_USER_WORDS = '@reminds_me/user_words/v1';
const KEY_LOGS = '@reminds_me/logs/v1';
const KEY_VOCAB_RESULT = '@reminds_me/vocab_test_result/v1';
const KEY_SUPPLEMENT = '@reminds_me/supplement_log/v1';
const KEY_PENDING_SHOWS = '@reminds_me/pending_shows/v1';
const KEY_SLIDES_SEEN = '@reminds_me/onboarding_slides_seen/v1';
const KEY_REVIEW_REQUESTED = '@reminds_me/review_requested/v1';

const MAX_LOG_ENTRIES = 500;

export const DEFAULT_PROFILE: Profile = {
  plan: 'free',
  notification_interval_min: 60,
  notification_blocks: [],
  daily_new_words: 10,
  onboarding_completed: false,
  toeic_experience: null,
  toeic_score: null,
  notification_slots: [
    { id: 'morning', emoji: '🌅', label: '朝', hour: 7, minute: 0, enabled: true },
    { id: 'commute', emoji: '🚌', label: '通勤', hour: 8, minute: 30, enabled: false },
    { id: 'lunch', emoji: '🍱', label: '昼休み', hour: 12, minute: 0, enabled: false },
    { id: 'night', emoji: '🌙', label: '寝る前', hour: 22, minute: 0, enabled: true },
  ],
};

// ============================================================
// Profile
// ============================================================

export async function getProfile(): Promise<Profile> {
  const raw = await AsyncStorage.getItem(KEY_PROFILE);
  if (!raw || raw === 'undefined' || raw === 'null') return DEFAULT_PROFILE;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return DEFAULT_PROFILE;
    }
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(patch: Partial<Profile>): Promise<Profile> {
  const current = await getProfile();
  const next: Profile = { ...current, ...patch };
  await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(next));
  return next;
}

// ============================================================
// UserWords  (keyed by word_id for fast lookups)
// ============================================================

export async function getUserWordsMap(): Promise<Record<string, UserWord>> {
  const raw = await AsyncStorage.getItem(KEY_USER_WORDS);
  if (!raw || raw === 'undefined' || raw === 'null') return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, UserWord>;
  } catch {
    return {};
  }
}

export async function getUserWord(wordId: string): Promise<UserWord | null> {
  const all = await getUserWordsMap();
  return all[wordId] ?? null;
}

export async function setUserWord(uw: UserWord): Promise<void> {
  const all = await getUserWordsMap();
  all[uw.word_id] = uw;
  await AsyncStorage.setItem(KEY_USER_WORDS, JSON.stringify(all));
}

export async function bulkSetUserWords(words: UserWord[]): Promise<void> {
  if (words.length === 0) return;
  const all = await getUserWordsMap();
  for (const w of words) all[w.word_id] = w;
  await AsyncStorage.setItem(KEY_USER_WORDS, JSON.stringify(all));
}

export function makeNewUserWord(
  wordId: string,
  overrides: Partial<UserWord> = {}
): UserWord {
  const nowIso = new Date().toISOString();
  return {
    word_id: wordId,
    status: 'new',
    display_count: 0,
    correct_count: 0,
    incorrect_count: 0,
    next_display_at: nowIso,
    interval_days: 1,
    last_displayed_at: null,
    created_at: nowIso,
    mastered_at: null,
    ...overrides,
  };
}

// ============================================================
// Daily new-word supplement counter
//   Tracks how many new words were added *today* so the daily quota
//   (Profile.daily_new_words) can be enforced across repeated supplement
//   calls within the same day. Resets automatically when the date rolls.
// ============================================================

interface SupplementLog {
  date: string; // YYYY-MM-DD
  count: number;
}

/** Local calendar day key (device timezone), so "today" matches the user's day. */
function todaySupplementKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function getTodaySupplementedCount(): Promise<number> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(KEY_SUPPLEMENT);
  } catch {
    return 0;
  }
  if (!raw || raw === 'undefined' || raw === 'null') return 0;
  try {
    const parsed = JSON.parse(raw) as Partial<SupplementLog>;
    if (!parsed || typeof parsed !== 'object') return 0;
    if (parsed.date !== todaySupplementKey()) return 0;
    return typeof parsed.count === 'number' && parsed.count > 0 ? parsed.count : 0;
  } catch {
    return 0;
  }
}

export async function recordSupplemented(added: number): Promise<void> {
  if (!Number.isFinite(added) || added <= 0) return;
  const current = await getTodaySupplementedCount();
  const next: SupplementLog = {
    date: todaySupplementKey(),
    count: current + added,
  };
  try {
    await AsyncStorage.setItem(KEY_SUPPLEMENT, JSON.stringify(next));
  } catch (e) {
    console.warn('[storage] recordSupplemented failed', e);
  }
}

// ============================================================
// Pending shows
//   Record of word notifications we've scheduled and *when they fire*. On the
//   next reschedule we credit the ones whose fire time has elapsed as "shown"
//   (display_count++) — iOS gives no delivery callback for background
//   notifications, so we infer delivery from the scheduled time passing.
// ============================================================

export interface PendingShow {
  wordId: string;
  fireAt: string; // ISO — scheduled fire time
}

export async function getPendingShows(): Promise<PendingShow[]> {
  const raw = await AsyncStorage.getItem(KEY_PENDING_SHOWS);
  if (!raw || raw === 'undefined' || raw === 'null') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        p &&
        typeof p === 'object' &&
        typeof p.wordId === 'string' &&
        typeof p.fireAt === 'string'
    ) as PendingShow[];
  } catch {
    return [];
  }
}

export async function setPendingShows(list: PendingShow[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      KEY_PENDING_SHOWS,
      JSON.stringify(Array.isArray(list) ? list : [])
    );
  } catch (e) {
    console.warn('[storage] setPendingShows failed', e);
  }
}

// ============================================================
// Onboarding slides (first-launch tutorial)
// ============================================================

export async function getSlidesSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_SLIDES_SEEN)) === 'true';
  } catch {
    return false;
  }
}

export async function setSlidesSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_SLIDES_SEEN, 'true');
  } catch (e) {
    console.warn('[storage] setSlidesSeen failed', e);
  }
}

// ============================================================
// App Store review prompt (shown once, on the first answer)
// ============================================================

export async function getReviewRequested(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY_REVIEW_REQUESTED)) === 'true';
  } catch {
    return false;
  }
}

export async function setReviewRequested(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_REVIEW_REQUESTED, 'true');
  } catch (e) {
    console.warn('[storage] setReviewRequested failed', e);
  }
}

// ============================================================
// Notification logs (capped)
// ============================================================

export async function getLogs(): Promise<NotificationLog[]> {
  const raw = await AsyncStorage.getItem(KEY_LOGS);
  if (!raw || raw === 'undefined' || raw === 'null') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as NotificationLog[];
  } catch {
    return [];
  }
}

export async function appendLog(log: NotificationLog): Promise<void> {
  const arr = await getLogs();
  arr.unshift(log);
  if (arr.length > MAX_LOG_ENTRIES) arr.length = MAX_LOG_ENTRIES;
  await AsyncStorage.setItem(KEY_LOGS, JSON.stringify(arr));
}

// ============================================================
// Maintenance
// ============================================================

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEY_PROFILE,
    KEY_USER_WORDS,
    KEY_LOGS,
    KEY_VOCAB_RESULT,
    KEY_SUPPLEMENT,
    KEY_PENDING_SHOWS,
    KEY_SLIDES_SEEN,
    KEY_REVIEW_REQUESTED,
  ]);
}

// ============================================================
// Vocabulary diagnostic test result
// ============================================================

export async function getVocabTestResult(): Promise<VocabTestResult | null> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(KEY_VOCAB_RESULT);
  } catch (e) {
    console.warn('[storage] getVocabTestResult read failed', e);
    return null;
  }
  if (!raw || raw === 'undefined' || raw === 'null') return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const r = parsed as Partial<VocabTestResult>;
    if (
      typeof r.level !== 'number' ||
      typeof r.score !== 'number' ||
      !Array.isArray(r.answers)
    ) {
      return null;
    }
    return r as VocabTestResult;
  } catch (e) {
    console.warn('[storage] getVocabTestResult parse failed', e);
    return null;
  }
}

/**
 * Manually override the vocabulary level (Settings screen). Preserves any
 * existing score/answers and just swaps the level so downstream word selection
 * and the home display pick it up.
 */
export async function setVocabLevel(level: VocabLevel): Promise<void> {
  const existing = await getVocabTestResult();
  await saveVocabTestResult({
    score: existing?.score ?? 0,
    level,
    answers: existing?.answers ?? [],
    completed_at: new Date().toISOString(),
  });
}

export async function saveVocabTestResult(
  result: VocabTestResult
): Promise<void> {
  if (!result || typeof result !== 'object') return;
  try {
    await AsyncStorage.setItem(KEY_VOCAB_RESULT, JSON.stringify(result));
  } catch (e) {
    console.warn('[storage] saveVocabTestResult failed', e);
  }
}
