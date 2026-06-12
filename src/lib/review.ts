import { Alert, Linking } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { getReviewRequested, setReviewRequested } from './storage';

/**
 * App Store page for the manual "レビューする" button when the native in-app
 * review API is unavailable. Replace with the real product URL after the app
 * ships (e.g. https://apps.apple.com/app/id0000000000?action=write-review).
 */
export const APP_STORE_URL = 'https://apps.apple.com/app/idXXXXXXXXXX';

async function isReviewAvailable(): Promise<boolean> {
  try {
    return await StoreReview.isAvailableAsync();
  } catch {
    return false;
  }
}

async function requestReviewSafe(): Promise<void> {
  try {
    await StoreReview.requestReview();
  } catch (e) {
    console.warn('[review] requestReview failed', e);
  }
}

/**
 * Prompt the user to leave an App Store review the very first time they answer
 * a word. Shows at most once (guarded by the persisted `review_requested` flag)
 * and only when the native review API is available. Tapping either button marks
 * the flag so the dialog never appears again.
 */
export async function maybePromptReviewOnFirstAnswer(): Promise<void> {
  if (await getReviewRequested()) return;
  if (!(await isReviewAvailable())) return;

  Alert.alert(
    'ながら単語、使えてますか？',
    'よろしければ、App Storeでレビューをお願いします。開発の励みになります！',
    [
      {
        text: 'あとで',
        style: 'cancel',
        onPress: () => {
          void setReviewRequested();
        },
      },
      {
        text: 'レビューする',
        onPress: () => {
          void setReviewRequested();
          void requestReviewSafe();
        },
      },
    ]
  );
}

/**
 * Manual review entry point (Settings → レビューする). Uses the native in-app
 * review prompt when available, otherwise opens the App Store page directly.
 */
export async function requestReviewManually(): Promise<void> {
  if (await isReviewAvailable()) {
    await requestReviewSafe();
    return;
  }
  Linking.openURL(APP_STORE_URL).catch((e) =>
    console.warn('[review] openURL failed', e)
  );
}
