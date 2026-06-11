import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Category for normal-mode (display-only) notifications. No buttons. */
export const NORMAL_CATEGORY = 'normal';

/** Category for test-mode notifications. Two answer buttons. */
export const TEST_CATEGORY = 'test';

export const ACTION_KNOW = 'know';
export const ACTION_DONT_KNOW = 'dont_know';

// Foreground display behavior.
// expo-notifications SDK 51 uses `shouldShowAlert` (legacy API).
// Newer SDKs split this into shouldShowBanner / shouldShowList.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Register the notification categories.
 *   - 'normal': no actions. Tapping just opens the app.
 *   - 'test':   long-pressing the notification reveals 「✅ わかる」/「❌ わからない」
 *               quick actions (handled in the background). A plain *tap* instead
 *               opens the in-app answer screen — so both paths work.
 */
export async function registerNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(NORMAL_CATEGORY, []);
  await Notifications.setNotificationCategoryAsync(TEST_CATEGORY, [
    {
      identifier: ACTION_KNOW,
      buttonTitle: '✅ わかる',
      options: { opensAppToForeground: false },
    },
    {
      identifier: ACTION_DONT_KNOW,
      buttonTitle: '❌ わからない',
      options: { opensAppToForeground: false },
    },
  ]);
}

// expo-notifications' NotificationPermissionsStatus extends a PermissionResponse
// imported from 'expo', which isn't re-exported in SDK 56's typings — so
// `status` and `granted` aren't visible. We type the fields we read locally.
interface NotificationPermissionsLike {
  status?: 'granted' | 'denied' | 'undetermined';
  granted?: boolean;
  ios?: { status?: Notifications.IosAuthorizationStatus };
}

function isPermissionGranted(
  raw: Notifications.NotificationPermissionsStatus
): boolean {
  const status = raw as unknown as NotificationPermissionsLike;
  if (status.granted) return true;
  if (status.status === 'granted') return true;
  const iosStatus = status.ios?.status;
  return (
    iosStatus === Notifications.IosAuthorizationStatus.AUTHORIZED ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await Notifications.getPermissionsAsync();
  if (isPermissionGranted(settings)) {
    if (Platform.OS === 'android') await ensureAndroidChannel();
    return true;
  }

  const request = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });

  const granted = isPermissionGranted(request);
  if (granted && Platform.OS === 'android') await ensureAndroidChannel();
  return granted;
}

async function ensureAndroidChannel(): Promise<void> {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function cancelAllScheduled(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ============================================================
// Repeating "safety net" notifications
//   Fire daily even if the user never opens the app, so the rolling word
//   queue can never go fully silent once it's exhausted. They use stable
//   identifiers so the word-queue refresh can cancel everything *except*
//   these.
// ============================================================

export const SAFETY_MORNING_ID = 'safety-morning';
export const SAFETY_EVENING_ID = 'safety-evening';
const SAFETY_IDS: readonly string[] = [SAFETY_MORNING_ID, SAFETY_EVENING_ID];

/** Cancel every scheduled word notification but keep the repeating safety nets. */
export async function cancelWordNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => !SAFETY_IDS.includes(n.identifier))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

/**
 * Ensure the two repeating safety-net notifications exist (08:00 / 21:00).
 * Idempotent — only (re)creates a missing one, so it won't reset the repeat
 * cycle on every reschedule.
 */
export async function ensureSafetyNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const existing = new Set(scheduled.map((n) => n.identifier));

  if (!existing.has(SAFETY_MORNING_ID)) {
    await Notifications.scheduleNotificationAsync({
      identifier: SAFETY_MORNING_ID,
      content: { title: 'ながら単語 for TOEIC', body: '今日も単語を確認しましょう 📚' },
      // SDK 51 daily trigger: { hour, minute, repeats: true }.
      trigger: {
        hour: 8,
        minute: 0,
        repeats: true,
      } as Notifications.NotificationTriggerInput,
    });
  }
  if (!existing.has(SAFETY_EVENING_ID)) {
    await Notifications.scheduleNotificationAsync({
      identifier: SAFETY_EVENING_ID,
      content: { title: 'ながら単語 for TOEIC', body: '今日の復習はできましたか？ 📖' },
      trigger: {
        hour: 21,
        minute: 0,
        repeats: true,
      } as Notifications.NotificationTriggerInput,
    });
  }
}
