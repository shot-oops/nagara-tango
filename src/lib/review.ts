import { Linking } from 'react-native';
import * as StoreReview from 'expo-store-review';

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
 * Show the App Store review dialog. Used after the first-mastery celebration and
 * from the Settings → レビューする button. Uses the native in-app review prompt
 * when available, otherwise opens the App Store page directly.
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
