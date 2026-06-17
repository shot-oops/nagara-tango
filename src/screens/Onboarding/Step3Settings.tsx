import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { NotificationBlocksEditor } from '../../components/NotificationBlocksEditor';
import { LockSlider } from '../../components/LockSlider';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/colors';
import { ensureNotificationPermission } from '../../lib/notifications';
import { useApp } from '../../context/AppContext';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import type { NotificationBlock, Plan } from '../../types';

interface Props {
  plan: Plan;
  onDone: () => void;
}

const MIN_INTERVAL = 5;
const MAX_INTERVAL = 60;
const FREE_MIN_INTERVAL = 30; // free: 30〜60分（30分未満は有料）
const MIN_DAILY = 5;
const MAX_DAILY = 30;
const FREE_MAX_DAILY = 10; // free: 5〜10語（11語以上は有料）

export function Step3Settings({ onDone }: Props) {
  const ctx = useApp();
  const updateProfile = ctx?.updateProfile;
  const { isPremium } = useRevenueCat();
  const isFree = !isPremium;

  const [interval, setIntervalMin] = useState(60);
  const [blocks, setBlocks] = useState<NotificationBlock[]>([{ start: 23, end: 7 }]);
  const [daily, setDaily] = useState(10);
  const [saving, setSaving] = useState(false);

  // Free users are limited to ≥30 min and ≤10 words; premium unlocks the rest.
  const intAllowedMin = isPremium ? MIN_INTERVAL : FREE_MIN_INTERVAL;
  const dayAllowedMax = isPremium ? MAX_DAILY : FREE_MAX_DAILY;
  const dispInterval = Math.max(intAllowedMin, Math.min(MAX_INTERVAL, interval));
  const dispDaily = Math.max(MIN_DAILY, Math.min(dayAllowedMax, daily));

  const onSave = async () => {
    setSaving(true);
    // Notifications are OPTIONAL. Request consent best-effort, but always
    // complete onboarding so the app is fully usable without notifications
    // (learning still works from the 復習 tab). Required for App Store 4.5.4.
    await ensureNotificationPermission().catch(() => false);
    if (updateProfile) {
      await updateProfile({
        notification_interval_min: dispInterval,
        notification_blocks: blocks,
        daily_new_words: dispDaily,
        onboarding_completed: true,
      }).catch((e) => console.warn('[step3] updateProfile failed', e));
    }
    setSaving(false);
    if (typeof onDone === 'function') onDone();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.step}>最後の設定</Text>
        <Text style={styles.title}>通知を設定しよう</Text>
        <Text style={styles.subtitle}>通知だけで学習が進みます。あとから変更できます。</Text>

        {/* Quiet hours (do-not-disturb) */}
        <Text style={styles.sectionTitle}>通知しない時間帯</Text>
        <Text style={styles.hint}>この時間帯には通知が届きません。最大3つまで設定できます。</Text>
        <View style={{ height: SPACING.sm }} />
        <NotificationBlocksEditor blocks={blocks} onChange={setBlocks} />

        {/* Interval slider — free locked below 30 min */}
        <View style={styles.sliderHead}>
          <Text style={styles.sectionTitle}>通知間隔</Text>
          <Text style={styles.sliderValue}>{dispInterval}分ごと</Text>
        </View>
        <LockSlider
          min={MIN_INTERVAL}
          max={MAX_INTERVAL}
          step={1}
          value={dispInterval}
          onChange={setIntervalMin}
          allowedMin={intAllowedMin}
          allowedMax={MAX_INTERVAL}
        />
        {isFree && <Text style={styles.hint}>🔒 30分未満は有料プランで解放（無料は30〜60分）</Text>}

        {/* Daily words slider — free locked above 10 words */}
        <View style={styles.sliderHead}>
          <Text style={styles.sectionTitle}>1日の新規単語数</Text>
          <Text style={styles.sliderValue}>{dispDaily}語</Text>
        </View>
        <LockSlider
          min={MIN_DAILY}
          max={MAX_DAILY}
          step={1}
          value={dispDaily}
          onChange={setDaily}
          allowedMin={MIN_DAILY}
          allowedMax={dayAllowedMax}
        />
        {isFree && <Text style={styles.hint}>🔒 11語以上は有料プランで解放（無料は5〜10語）</Text>}

        <View style={{ height: SPACING.xl }} />
        <Button title="保存して始める" loading={saving} onPress={onSave} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  step: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.sm },
  title: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.text, marginTop: SPACING.xs },
  subtitle: { color: COLORS.textMuted, marginTop: SPACING.xs, fontSize: FONT_SIZE.sm },
  sectionTitle: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  sliderHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sliderValue: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: FONT_SIZE.lg,
    marginBottom: SPACING.sm,
  },
  sliderEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  endLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
  },
  chipOn: { backgroundColor: COLORS.primary },
  chipLocked: { opacity: 0.55 },
  chipText: { color: COLORS.text, fontWeight: '700' },
  chipTextOn: { color: COLORS.onPrimary },
  lock: { fontSize: FONT_SIZE.xs },
  hint: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: SPACING.sm },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  dailyRowOn: { borderColor: COLORS.primary },
  dailyLocked: { opacity: 0.55 },
  dailyLabel: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZE.md },
  dailyLabelOn: { color: COLORS.primary },
  dailyRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  dailyValue: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONT_SIZE.md },
  dailyValueOn: { color: COLORS.primary },
});
