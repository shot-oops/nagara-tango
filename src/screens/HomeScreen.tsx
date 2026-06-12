import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../constants/colors';
import { PRIMARY_GRADIENT } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { getUserWordsMap, getVocabTestResult } from '../lib/storage';
import { getAllWords } from '../lib/wordRepository';
import { TOEIC_LEVEL_LABEL } from '../types';
import type { VocabLevel } from '../types';

interface Progress {
  learning: number;
  mastered: number;
  remaining: number;
  total: number;
}

const pad = (n: number) => `${n}`.padStart(2, '0');

/** Map any expo-notifications trigger to its next fire Date. */
function triggerToDate(trigger: unknown): Date | null {
  if (!trigger || typeof trigger !== 'object') return null;
  const t = trigger as {
    date?: number | string;
    value?: number;
    seconds?: number;
    hour?: number;
    minute?: number;
    dateComponents?: { hour?: number; minute?: number };
  };
  if (t.date != null) {
    const d = new Date(t.date);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof t.value === 'number') return new Date(t.value);
  if (typeof t.seconds === 'number') return new Date(Date.now() + t.seconds * 1000);
  const hour = t.hour ?? t.dateComponents?.hour;
  const minute = t.minute ?? t.dateComponents?.minute;
  if (typeof hour === 'number' && typeof minute === 'number') {
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
    return next;
  }
  return null;
}

/** "1:23:45" / "5:09" countdown from a millisecond remainder. */
function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

export function HomeScreen() {
  const ctx = useApp();
  const profile = ctx?.profile;
  const rescheduleNotifications = ctx?.rescheduleNotifications;
  const refreshPlan = ctx?.refreshPlan;
  const [progress, setProgress] = useState<Progress>({
    learning: 0,
    mastered: 0,
    remaining: 0,
    total: 0,
  });
  const [level, setLevel] = useState<VocabLevel | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [nextAt, setNextAt] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());

  const refreshNextAt = useCallback(async () => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      let soonest: Date | null = null;
      for (const n of scheduled) {
        const d = triggerToDate(n.trigger);
        if (d && d.getTime() > Date.now() && (!soonest || d < soonest)) soonest = d;
      }
      setNextAt(soonest);
    } catch {
      setNextAt(null);
    }
  }, []);

  // 1-second ticker for the countdown.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // When the countdown reaches the fire time, re-fetch the next one.
  useEffect(() => {
    if (nextAt && now >= nextAt.getTime()) refreshNextAt();
  }, [now, nextAt, refreshNextAt]);

  const loadData = useCallback(async () => {
    const [allWordsRaw, userWordsRaw, resultRaw] = await Promise.all([
      getAllWords().catch(() => [] as Awaited<ReturnType<typeof getAllWords>>),
      getUserWordsMap().catch(
        () => ({}) as Awaited<ReturnType<typeof getUserWordsMap>>
      ),
      getVocabTestResult().catch(() => null),
    ]);
    const allWords = Array.isArray(allWordsRaw) ? allWordsRaw : [];
    const userWords: Awaited<ReturnType<typeof getUserWordsMap>> =
      userWordsRaw && typeof userWordsRaw === 'object' ? userWordsRaw : {};

    let learning = 0;
    let mastered = 0;
    for (const w of allWords) {
      if (!w || !w.id) continue;
      const uw = userWords[w.id];
      if (!uw) continue;
      if (uw.status === 'mastered' || uw.status === 'known') mastered += 1;
      else if (uw.status === 'learning' || uw.status === 'new') learning += 1;
    }

    setProgress({
      learning,
      mastered,
      remaining: Math.max(0, allWords.length - learning - mastered),
      total: allWords.length,
    });
    setLevel(resultRaw && typeof resultRaw.level === 'number' ? resultRaw.level : null);
    await refreshNextAt();
  }, [refreshNextAt]);

  const reloadAll = useCallback(async () => {
    if (rescheduleNotifications) await rescheduleNotifications().catch(() => {});
    await loadData();
  }, [loadData, rescheduleNotifications]);

  // Refresh whenever the Home screen gains focus — e.g. returning from Settings
  // after saving, or switching back to the Home tab.
  useFocusEffect(
    useCallback(() => {
      reloadAll();
    }, [reloadAll])
  );

  // Refresh when the app returns to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') reloadAll();
    });
    return () => sub.remove();
  }, [reloadAll]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (refreshPlan) await refreshPlan().catch(() => {});
    if (rescheduleNotifications) await rescheduleNotifications().catch(() => {});
    await loadData();
    setRefreshing(false);
  }, [loadData, rescheduleNotifications, refreshPlan]);

  const intervalMin = profile?.notification_interval_min ?? 60;
  const engaged = progress.learning + progress.mastered;
  // Overall mastery: mastered / whole word pool (e.g. 10 / 1000 = 1%).
  const pct =
    progress.total > 0 ? Math.round((progress.mastered / progress.total) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.brand}>
            ながら単語<Text style={styles.brandSmall}> for TOEIC</Text>
          </Text>
        </View>

        {/* Course hero card */}
        <LinearGradient
          colors={PRIMARY_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroLabel}>TOEIC</Text>
          <Text style={styles.heroLevel}>
            {level ? TOEIC_LEVEL_LABEL[level] : '診断未実施'}
          </Text>
          <View style={styles.heroFooter}>
            <Text style={styles.heroPctLabel}>習得進捗</Text>
            <Text style={styles.heroPct}>{pct}%</Text>
          </View>
        </LinearGradient>

        {/* Next-notification countdown */}
        <Card style={styles.countdownCard}>
          <Text style={styles.countdownLabel}>次の通知まで</Text>
          <Text style={styles.countdownValue}>
            {nextAt ? formatRemaining(nextAt.getTime() - now) : '—'}
          </Text>
        </Card>

        {/* Learning progress bar */}
        <Card style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text style={styles.progressLabel}>学習進捗</Text>
            <Text style={styles.progressCount}>
              {progress.mastered} / {engaged} 語
            </Text>
          </View>
          <ProgressBar progress={engaged > 0 ? progress.mastered / engaged : 0} height={10} />
        </Card>

        <Text style={styles.sectionTitle}>学習状況</Text>
        <View style={styles.statsRow}>
          <Stat icon="📖" label="学習中" value={progress.learning} color={COLORS.text} />
          <Stat icon="✅" label="習得済み" value={progress.mastered} color={COLORS.primary} />
          <Stat icon="⭕" label="未学習" value={progress.remaining} color={COLORS.textMuted} />
        </View>

        {/* Notification interval */}
        <Card style={styles.intervalCard}>
          <Text style={styles.intervalLabel}>通知間隔</Text>
          <Text style={styles.intervalValue}>{intervalMin} 分ごと</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  brand: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    color: COLORS.primary,
    flexShrink: 1,
  },
  brandSmall: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  hero: {
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    ...SHADOW,
  },
  heroLabel: { color: COLORS.onPrimary, fontSize: FONT_SIZE.sm, fontWeight: '700', opacity: 0.7 },
  heroLevel: {
    color: COLORS.onPrimary,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    marginTop: SPACING.xs,
  },
  heroFooter: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: SPACING.xs,
  },
  heroPctLabel: { color: COLORS.onPrimary, fontSize: FONT_SIZE.xs, marginBottom: 3, opacity: 0.7 },
  heroPct: { color: COLORS.onPrimary, fontSize: FONT_SIZE.xl, fontWeight: '800' },
  countdownCard: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countdownLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  countdownValue: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  progressCard: { marginTop: SPACING.md },
  progressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  progressLabel: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZE.md },
  progressCount: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  sectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  statsRow: { flexDirection: 'row', gap: SPACING.md },
  statCell: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    ...SHADOW,
  },
  statIcon: { fontSize: FONT_SIZE.lg, marginBottom: SPACING.xs },
  statValue: { fontSize: FONT_SIZE.xxxl, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, marginTop: SPACING.xs, fontSize: FONT_SIZE.xs },
  intervalCard: { marginTop: SPACING.lg },
  intervalLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  intervalValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
});
