import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
  type CustomerInfo,
  type PurchasesPackage,
} from 'react-native-purchases';

/** Entitlement that unlocks all paid features (must match the RevenueCat
 * dashboard Entitlement identifier exactly). */
export const ENTITLEMENT_ID = 'ながら単語 for TOEIC Premium';

/** Placeholder product IDs (register the real ones in App Store Connect). */
export const PRODUCT_MONTHLY = 'nagaratango_premium_monthly';
export const PRODUCT_YEARLY = 'nagaratango_premium_yearly';

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

/** True when the user has the premium entitlement (or the dev override is on). */
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

/**
 * Resolve the monthly / annual package from RevenueCat's current offering.
 * Throws a *descriptive* error pinpointing which part of the RevenueCat / App
 * Store Connect setup is missing, so "取得できませんでした" is never a dead end.
 */
async function resolvePackage(
  kind: 'monthly' | 'annual'
): Promise<PurchasesPackage> {
  if (!configured) throw new Error('not initialized');

  let offerings: Awaited<ReturnType<typeof Purchases.getOfferings>>;
  try {
    offerings = await Purchases.getOfferings();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[purchases] getOfferings failed', e);
    throw new Error(`オファリングの取得に失敗しました：${msg}`);
  }

  console.info('[purchases] offerings', {
    current: offerings.current?.identifier ?? null,
    all: Object.keys(offerings.all ?? {}),
    packages: offerings.current?.availablePackages?.map((p) => p.identifier) ?? [],
  });

  const current = offerings.current;
  if (!current) {
    const ids = Object.keys(offerings.all ?? {});
    throw new Error(
      ids.length === 0
        ? '商品(オファリング)が見つかりません。App Store Connectの自動更新サブスクと、RevenueCatのOffering／商品の紐付けを確認してください。'
        : `「現在(Current)」のオファリングが未設定です（定義済み: ${ids.join(', ')}）。RevenueCatでCurrentに指定してください。`
    );
  }

  const pkg = kind === 'monthly' ? current.monthly : current.annual;
  if (!pkg) {
    const available = current.availablePackages?.map((p) => p.identifier) ?? [];
    throw new Error(
      `オファリング「${current.identifier}」に${kind === 'monthly' ? '月額' : '年額'}パッケージがありません` +
        `（利用可能: ${available.join(', ') || 'なし'}）。` +
        'App Store Connectの商品が「提出準備完了」かつ有料App契約が有効か確認してください。'
    );
  }
  return pkg;
}

/** Purchase the monthly package. Returns true if premium is now active.
 * Throws on failure; a user-cancelled error carries `userCancelled: true`. */
export async function purchaseMonthly(): Promise<boolean> {
  const pkg = await resolvePackage('monthly');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return entitlementActive(customerInfo);
}

export async function purchaseYearly(): Promise<boolean> {
  const pkg = await resolvePackage('annual');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return entitlementActive(customerInfo);
}

export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.restorePurchases();
  return entitlementActive(info);
}
