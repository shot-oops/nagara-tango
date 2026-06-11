import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Notifications from 'expo-notifications';
import {
  DEFAULT_PROFILE,
  clearAllData,
  getProfile,
  saveProfile,
} from '../lib/storage';
import { scheduleNextNotifications } from '../lib/scheduler';
import {
  answerWord,
  classifyResponse,
  handleNormalTap,
} from '../lib/responseHandler';
import {
  ensureNotificationPermission,
  registerNotificationCategories,
} from '../lib/notifications';
import { initPurchases, isPremium } from '../services/purchases';
import { getSupabase } from '../lib/supabase';
import { getAllWords } from '../lib/wordRepository';
import type { Plan, Profile } from '../types';

interface AppContextValue {
  profile: Profile;
  loading: boolean;
  /** wordId to show the わかる / わからない answer screen for, or null. */
  answerWordId: string | null;
  dismissAnswer: () => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<Profile>;
  rescheduleNotifications: () => Promise<void>;
  resetAll: () => Promise<void>;
  refreshPlan: () => Promise<Plan>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [answerWordId, setAnswerWordId] = useState<string | null>(null);
  const responseSubRef = useRef<Notifications.Subscription | null>(null);

  // First-load: register categories, init RevenueCat, restore profile.
  // Reschedules notifications on cold start (one of the two allowed triggers).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await registerNotificationCategories();
      } catch (e) {
        console.warn('[notif] registerNotificationCategories failed', e);
      }
      try {
        await initPurchases();
      } catch (e) {
        console.warn('[revenuecat] init failed', e);
      }

      // Warm the master-word cache only when Supabase is actually wired up.
      // Without this check, downstream consumers see [] on first run.
      if (getSupabase()) {
        getAllWords().catch((e) =>
          console.warn('[wordRepo] initial warm failed', e)
        );
      }

      const storedRaw = await getProfile().catch((e) => {
        console.warn('[storage] getProfile failed', e);
        return DEFAULT_PROFILE;
      });
      const stored =
        storedRaw && typeof storedRaw === 'object' ? storedRaw : DEFAULT_PROFILE;
      let next = stored;

      try {
        const plan: Plan = (await isPremium()) ? 'paid' : 'free';
        if (plan !== stored.plan) {
          next = await saveProfile({ plan });
        }
      } catch {
        // ignore — keep cached plan
      }

      if (cancelled) return;
      setProfile(next);
      setLoading(false);

      if (next && next.onboarding_completed) {
        await scheduleNextNotifications().catch((e) =>
          console.warn('[notif] scheduleNextNotifications failed', e)
        );
      }

      // Cold start via a notification: handle the launching response.
      try {
        const last = await Notifications.getLastNotificationResponseAsync();
        const c = classifyResponse(last);
        if (!cancelled && c) {
          if (c.action === 'know') answerWord(c.wordId, true).catch(() => {});
          else if (c.action === 'dont_know')
            answerWord(c.wordId, false).catch(() => {});
          else if (c.action === 'open') setAnswerWordId(c.wordId);
        }
      } catch (e) {
        console.warn('[notif] getLastNotificationResponse failed', e);
      }
    })();

    responseSubRef.current?.remove();
    responseSubRef.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const c = classifyResponse(response);
        if (!c) return;
        if (c.action === 'know') {
          answerWord(c.wordId, true).catch((e) =>
            console.warn('[notif] know action failed', e)
          );
        } else if (c.action === 'dont_know') {
          answerWord(c.wordId, false).catch((e) =>
            console.warn('[notif] dont_know action failed', e)
          );
        } else if (c.action === 'open') {
          // Tapping a test notification opens the in-app answer screen.
          setAnswerWordId(c.wordId);
        } else {
          handleNormalTap(c.wordId).catch((e) =>
            console.warn('[notif] normal tap handler failed', e)
          );
        }
      });

    return () => {
      cancelled = true;
      responseSubRef.current?.remove();
      responseSubRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!profile.onboarding_completed) return;
    ensureNotificationPermission().catch(() => {});
  }, [profile.onboarding_completed]);

  // Whenever notification-relevant settings change, reschedule.
  // Profile mutations go through updateProfile() so storage is already up to
  // date when this fires.
  useEffect(() => {
    if (!profile.onboarding_completed) return;
    scheduleNextNotifications().catch((e) =>
      console.warn('[notif] scheduleNextNotifications failed', e)
    );
  }, [
    profile.onboarding_completed,
    profile.notification_interval_min,
    // notification_blocks is a JSON array — stringify for dep-array compare.
    JSON.stringify(profile.notification_blocks),
  ]);

  const refreshProfile = useCallback(async () => {
    const p = await getProfile();
    setProfile(p);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Profile>): Promise<Profile> => {
      const next = await saveProfile(patch);
      setProfile(next);
      return next;
    },
    []
  );

  const rescheduleNotifications = useCallback(async () => {
    await scheduleNextNotifications();
  }, []);

  const refreshPlan = useCallback(async (): Promise<Plan> => {
    const plan: Plan = (await isPremium()) ? 'paid' : 'free';
    const next = await saveProfile({ plan });
    setProfile(next);
    return plan;
  }, []);

  const dismissAnswer = useCallback(() => {
    setAnswerWordId(null);
  }, []);

  const resetAll = useCallback(async () => {
    // Cancel every pending notification (incl. the repeating safety nets)
    // before wiping storage, so stale reminders don't keep firing post-reset.
    await Notifications.cancelAllScheduledNotificationsAsync().catch((e) =>
      console.warn('[notif] cancelAll on reset failed', e)
    );
    await clearAllData();
    setAnswerWordId(null);
    setProfile(DEFAULT_PROFILE);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      profile,
      loading,
      answerWordId,
      dismissAnswer,
      refreshProfile,
      updateProfile,
      rescheduleNotifications,
      resetAll,
      refreshPlan,
    }),
    [
      profile,
      loading,
      answerWordId,
      dismissAnswer,
      refreshProfile,
      updateProfile,
      rescheduleNotifications,
      resetAll,
      refreshPlan,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
