import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  initPurchases,
  isPremium as checkPremium,
  purchaseMonthly as buyMonthly,
  purchaseYearly as buyYearly,
  restorePurchases as restore,
  setDevPremium as setDevPremiumOverride,
} from '../services/purchases';

interface UseRevenueCat {
  isPremium: boolean;
  isLoading: boolean;
  error: string | null;
  purchaseMonthly: () => Promise<void>;
  purchaseYearly: () => Promise<void>;
  restorePurchases: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Dev-only: force premium ON/OFF (no-op in production). */
  setDevPremium: (on: boolean) => Promise<void>;
}

function messageFor(e: unknown): string {
  const m = e instanceof Error ? e.message : '不明なエラーが発生しました。';
  return m.includes('not initialized')
    ? 'アプリ内課金は本番ビルド（App Store / TestFlight）で有効になります。'
    : m;
}

function isUserCancelled(e: unknown): boolean {
  return !!e && typeof e === 'object' && (e as { userCancelled?: boolean }).userCancelled === true;
}

export function useRevenueCat(): UseRevenueCat {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await initPurchases();
      setIsPremium(await checkPremium());
    } catch (e) {
      setError(messageFor(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const runPurchase = useCallback(
    async (buy: () => Promise<boolean>) => {
      setError(null);
      try {
        const ok = await buy();
        await refresh();
        Alert.alert(
          ok ? 'ありがとうございます！' : '購入を確認できませんでした',
          ok ? 'プレミアムが有効になりました。' : 'もう一度お試しください。'
        );
      } catch (e) {
        if (isUserCancelled(e)) return; // cancelled → do nothing
        const msg = messageFor(e);
        setError(msg);
        Alert.alert('購入に失敗しました', msg);
      }
    },
    [refresh]
  );

  const purchaseMonthly = useCallback(() => runPurchase(buyMonthly), [runPurchase]);
  const purchaseYearly = useCallback(() => runPurchase(buyYearly), [runPurchase]);

  const restorePurchases = useCallback(async () => {
    setError(null);
    try {
      const ok = await restore();
      await refresh();
      Alert.alert(
        '購入の復元が完了しました',
        ok ? 'プレミアムが有効です。' : '復元できる購入は見つかりませんでした。'
      );
    } catch (e) {
      const msg = messageFor(e);
      setError(msg);
      Alert.alert('復元に失敗しました', msg);
    }
  }, [refresh]);

  const setDevPremium = useCallback(
    async (on: boolean) => {
      await setDevPremiumOverride(on);
      await refresh();
    },
    [refresh]
  );

  return {
    isPremium,
    isLoading,
    error,
    purchaseMonthly,
    purchaseYearly,
    restorePurchases,
    refresh,
    setDevPremium,
  };
}
