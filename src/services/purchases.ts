import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

/** Entitlement that unlocks all paid features. */
export const ENTITLEMENT_ID = 'premium';

/** Placeholder product IDs (register the real ones in App Store Connect). */
export const PRODUCT_MONTHLY = 'nagaratango_monthly_490';
export const PRODUCT_YEARLY = 'nagaratango_yearly_3900';

const DEV_PREMIUM_KEY = '@nagaratango/dev_premium';

let configured = false;

/** Read the platform API key from env first, falling back to app.json extra. */
function resolveApiKey(): string {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  if (Platform.OS === 'ios') {
    return (
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
      (typeof extra.revenuecatIosKey === 'string' ? extra.revenuecatIosKey : '')
    );
  }
  return (
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
    (typeof extra.revenuecatAndroidKey === 'string' ? extra.revenuecatAndroidKey : '')
  );
}

/** Configure RevenueCat. Idempotent and safe to call without a key (the app
 * then runs in free mode without crashing). */
export async function initPurchases(): Promise<void> {
  if (configured) return;
  const apiKey = resolveApiKey();
  if (!apiKey) {
    console.info('[purchases] no API key — billing disabled (free mode)');
    return;
  }
  try {
    Purchases.configure({ apiKey });
    configured = true;
  } catch (e) {
    console.warn('[purchases] configure failed', e);
  }
}

export function isConfigured(): boolean {
  return configured;
}

function entitlementActive(info: CustomerInfo | null | undefined): boolean {
  const active = info?.entitlements?.active;
  return !!active && typeof active === 'object' && !!active[ENTITLEMENT_ID];
}

// ── __DEV__ premium override ─────────────────────────────────────────────
export async function getDevPremium(): Promise<boolean> {
  if (!__DEV__) return false;
  try {
    return (await AsyncStorage.getItem(DEV_PREMIUM_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setDevPremium(on: boolean): Promise<void> {
  if (!__DEV__) return;
  try {
    await AsyncStorage.setItem(DEV_PREMIUM_KEY, on ? 'true' : 'false');
  } catch {
    /* ignore */
  }
}

/** True when the user has the `premium` entitlement (or the dev override is on). */
export async function isPremium(): Promise<boolean> {
  if (await getDevPremium()) return true;
  if (!configured) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return entitlementActive(info);
  } catch {
    return false;
  }
}

async function getPackage(kind: 'monthly' | 'annual'): Promise<PurchasesPackage | null> {
  if (!configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return null;
    return (kind === 'monthly' ? current.monthly : current.annual) ?? null;
  } catch {
    return null;
  }
}

/** Purchase the monthly package. Returns true if premium is now active.
 * Throws on failure; a user-cancelled error carries `userCancelled: true`. */
export async function purchaseMonthly(): Promise<boolean> {
  if (!configured) throw new Error('not initialized');
  const pkg = await getPackage('monthly');
  if (!pkg) throw new Error('月額プランを取得できませんでした。');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return entitlementActive(customerInfo);
}

export async function purchaseYearly(): Promise<boolean> {
  if (!configured) throw new Error('not initialized');
  const pkg = await getPackage('annual');
  if (!pkg) throw new Error('年額プランを取得できませんでした。');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return entitlementActive(customerInfo);
}

export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.restorePurchases();
  return entitlementActive(info);
}
