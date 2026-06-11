import * as Notifications from 'expo-notifications';
import { skipBlockZones } from './notificationBlocks';
import {
  NORMAL_CATEGORY,
  TEST_CATEGORY,
  cancelWordNotifications,
  ensureSafetyNotifications,
} from './notifications';
import {
  getPendingShows,
  getProfile,
  getUserWord,
  getUserWordsMap,
  setPendingShows,
  setUserWord,
  type PendingShow,
} from './storage';
import { applyShown } from './sm2';
import { getAllWords } from './wordRepository';
import { supplementNewWords } from './wordSupplier';
import type { MasterWord, UserWord } from '../types';

/**
 * iOS caps pending local notifications at 64. We fill up to 60 word slots and
 * reserve the remainder for the two repeating safety-net notifications. There
 * is intentionally no time-window cap any more — we use the whole runway the
 * 64-slot budget allows so the queue survives longer between app opens.
 */
const MAX_NOTIFICATIONS = 60;

/**
 * Normal-mode shows before a word graduates to test mode. With a threshold of
 * 3 the word is shown in normal mode 3 times, so the *4th* appearance is the
 * わかる / わからない test.
 */
const TEST_MODE_THRESHOLD = 3;

interface SchedRow {
  wordId: string;
  uw: UserWord;
  english: string;
  japanese: string;
}

function buildSorted(
  userWords: Record<string, UserWord>,
  masterByid: Map<string, MasterWord>
): SchedRow[] {
  const rows: SchedRow[] = [];
  if (!userWords || typeof userWords !== 'object') return rows;
  const now = Date.now();
  for (const [wordId, uw] of Object.entries(userWords)) {
    if (!uw || typeof uw !== 'object') continue;
    // Due-gating: only words whose review time has arrived are eligible. This
    // is what makes わかる actually delay a word (and lets mastered words rest
    // for ~1 week / ~1 month before resurfacing) instead of firing every cycle.
    // Mastered words ARE included — they come back for review once due.
    const dueAt = new Date(uw.next_display_at).getTime();
    if (Number.isFinite(dueAt) && dueAt > now) continue;
    const w = masterByid.get(wordId);
    if (!w) continue;
    rows.push({ wordId, uw, english: w.english, japanese: w.japanese });
  }
  rows.sort((a, b) => (a.uw.next_display_at < b.uw.next_display_at ? -1 : 1));
  return rows;
}

/**
 * Serializes concurrent schedule runs. Cold start (AppContext) and the
 * HomeScreen mount can both trigger a reschedule near-simultaneously; sharing
 * one in-flight run avoids double-supplementing and double-scheduling.
 */
let inFlight: Promise<void> | null = null;

/**
 * Rolling 48h scheduler. Tops up the daily new-word quota, then walks
 * user_words (ordered by next_display_at) and assigns time slots — so due
 * reviews fire first and freshly supplemented words fill the rest.
 *
 * Bails out gracefully when the master pool is empty (Supabase unconfigured
 * or cache cold) — notifications get scheduled on the next call once words
 * are fetched.
 */
export function scheduleNextNotifications(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = runSchedule().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

/**
 * Credit notifications that have already fired as "shown" so a word's
 * display_count advances even when the user never taps the notification.
 * iOS provides no delivery callback for background notifications, so we infer
 * delivery from the scheduled fire time having elapsed.
 */
async function reconcileElapsedShows(pending: PendingShow[]): Promise<void> {
  if (pending.length === 0) return;
  const now = Date.now();
  for (const p of pending) {
    if (new Date(p.fireAt).getTime() > now) continue; // not fired yet
    const uw = await getUserWord(p.wordId);
    if (!uw || uw.status === 'mastered') continue;
    // Only normal-mode words progress via a passive show; test-mode words
    // wait for an explicit わかる / わからない answer.
    if (uw.display_count >= TEST_MODE_THRESHOLD) continue;
    await setUserWord({ ...uw, ...applyShown(uw) });
  }
}

async function runSchedule(): Promise<void> {
  // Clear only the rolling word queue — the repeating safety nets survive.
  await cancelWordNotifications();
  // Always (re)arm the safety nets, even when we bail early below (empty pool),
  // so the user is never left with zero scheduled notifications.
  await ensureSafetyNotifications();

  // Snapshot the previous schedule, then credit fired-but-not-tapped
  // notifications before we re-read user_words.
  const pending = await getPendingShows();
  await reconcileElapsedShows(pending);

  const profile = await getProfile();

  // Refill today's new-word quota before reading user_words so the queue keeps
  // growing past the initial diagnostic set. Self-caps to the daily quota.
  await supplementNewWords(profile.daily_new_words).catch((e) =>
    console.warn('[scheduler] supplement failed', e)
  );

  const userWords = await getUserWordsMap();
  const master = await getAllWords();
  if (!Array.isArray(master) || master.length === 0) {
    await setPendingShows([]);
    return;
  }

  const masterById = new Map<string, MasterWord>();
  for (const w of master) masterById.set(w.id, w);

  const sorted = buildSorted(userWords, masterById);
  if (sorted.length === 0) {
    await setPendingShows([]);
    return;
  }

  const intervalMs = profile.notification_interval_min * 60 * 1000;
  const nowMs = Date.now();

  // Anchor the next fire to the earliest still-pending notification from the
  // previous schedule, so repeated reschedules (app open / pull-to-refresh)
  // don't keep pushing the next notification another `interval` into the
  // future. Only start fresh (now + interval) when nothing is still pending.
  const futureFires = pending
    .map((p) => new Date(p.fireAt).getTime())
    .filter((t) => Number.isFinite(t) && t > nowMs);
  const anchorMs =
    futureFires.length > 0 ? Math.min(...futureFires) : nowMs + intervalMs;

  let currentTime = new Date(anchorMs);
  let scheduledCount = 0;
  const newPending: PendingShow[] = [];

  for (const row of sorted) {
    if (scheduledCount >= MAX_NOTIFICATIONS) break;

    currentTime = skipBlockZones(currentTime, profile.notification_blocks);

    const isTestMode = row.uw.display_count >= TEST_MODE_THRESHOLD;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: row.english,
        body: isTestMode ? '' : row.japanese,
        categoryIdentifier: isTestMode ? TEST_CATEGORY : NORMAL_CATEGORY,
        data: {
          wordId: row.wordId,
          type: isTestMode ? 'test' : 'normal',
        },
      },
      // SDK 51 accepts { date } directly; `type` / SchedulableTriggerInputTypes
      // are SDK 52+ APIs that don't exist on the installed package.
      trigger: { date: currentTime },
    });

    // Remember when this word notification fires, so the next reschedule can
    // credit it as "shown" even if the user never taps it.
    newPending.push({ wordId: row.wordId, fireAt: currentTime.toISOString() });

    currentTime = new Date(currentTime.getTime() + intervalMs);
    scheduledCount += 1;
  }

  await setPendingShows(newPending);
}
