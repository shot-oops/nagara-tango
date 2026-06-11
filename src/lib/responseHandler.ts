import * as Notifications from 'expo-notifications';
import { ACTION_DONT_KNOW, ACTION_KNOW } from './notifications';
import { applyCorrect, applyIncorrect } from './sm2';
import { appendLog, getProfile, getUserWord, setUserWord } from './storage';
import { scheduleNextNotifications } from './scheduler';
import { supplementReplacements } from './wordSupplier';
import type { NotificationType, UserWord, WordStatus } from '../types';

interface NotificationData {
  wordId?: string;
  type?: NotificationType;
}

export interface ParsedResponse {
  wordId: string;
  type: NotificationType;
}

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Pull the wordId / type out of a notification response. Returns null for
 * anything we can't act on (missing data, malformed payload).
 */
export function parseNotificationResponse(
  response: Notifications.NotificationResponse | null
): ParsedResponse | null {
  if (!response || !response.notification || !response.notification.request) {
    return null;
  }
  const content = response.notification.request.content;
  const rawData = content && typeof content === 'object' ? content.data : null;
  const data: NotificationData =
    rawData && typeof rawData === 'object' && !Array.isArray(rawData)
      ? (rawData as NotificationData)
      : {};
  if (!data.wordId || typeof data.wordId !== 'string') return null;
  const type: NotificationType = data.type === 'test' ? 'test' : 'normal';
  return { wordId: data.wordId, type };
}

export type ResponseAction = 'know' | 'dont_know' | 'open' | 'normal';

/**
 * Classify a notification response into an action:
 *   - 'know' / 'dont_know': a long-press quick-action button was used.
 *   - 'open': a test notification was tapped → open the in-app answer screen.
 *   - 'normal': a normal notification was tapped.
 */
export function classifyResponse(
  response: Notifications.NotificationResponse | null
): { action: ResponseAction; wordId: string } | null {
  const parsed = parseNotificationResponse(response);
  if (!parsed) return null;
  const actionId = response?.actionIdentifier;
  if (actionId === ACTION_KNOW) return { action: 'know', wordId: parsed.wordId };
  if (actionId === ACTION_DONT_KNOW) return { action: 'dont_know', wordId: parsed.wordId };
  if (parsed.type === 'test') return { action: 'open', wordId: parsed.wordId };
  return { action: 'normal', wordId: parsed.wordId };
}

/**
 * Record a わかる / わからない answer for a word and reschedule.
 * Called from the in-app answer screen and from the long-press quick actions.
 */
export async function answerWord(
  wordId: string,
  known: boolean
): Promise<WordStatus | null> {
  if (!wordId || typeof wordId !== 'string') return null;
  const userWord = await getUserWord(wordId);
  if (!userWord) return null;

  let updated: UserWord;
  if (known) {
    updated = { ...userWord, ...applyCorrect(userWord) };
  } else {
    const profile = await getProfile();
    updated = {
      ...userWord,
      ...applyIncorrect(userWord, profile.notification_interval_min),
    };
  }
  await setUserWord(updated);
  await appendLog({
    id: genId(),
    word_id: wordId,
    type: 'test',
    result: known ? 'correct' : 'incorrect',
    notified_at: new Date().toISOString(),
  });
  // A correct answer pushes this word's next review far out, so it leaves the
  // active notification queue. Backfill one new word to keep the drip going.
  if (known) {
    await supplementReplacements(1).catch(() => {});
  }
  await scheduleNextNotifications();
  return updated.status;
}

/**
 * Default tap on a normal-mode notification. display_count is credited
 * passively by the scheduler's reconcile (based on fire time), so we just log
 * the tap and reschedule.
 */
export async function handleNormalTap(wordId: string): Promise<void> {
  if (!wordId || typeof wordId !== 'string') return;
  await appendLog({
    id: genId(),
    word_id: wordId,
    type: 'normal',
    result: 'shown',
    notified_at: new Date().toISOString(),
  });
  await scheduleNextNotifications();
}
