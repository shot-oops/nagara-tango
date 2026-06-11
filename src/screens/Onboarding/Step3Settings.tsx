import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { NotificationBlocksEditor } from '../../components/NotificationBlocksEditor';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/colors';
import { ensureNotificationPermission } from '../../lib/notifications';
import { useApp } from '../../context/AppContext';
import { useRevenueCat } from '../../hooks/useRevenueCat';
import type { NotificationBlock, Plan } from '../../types';

interface Props {
  plan: Plan;
  onDone: () => void;
}

const INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 60];
const FREE_INTERVALS = [30, 60];
const DAILY_OPTIONS: { value: number; label: string }[] = [
  { value: 5, label: '1歩ずつ' },
  { value: 10, label: '標準' },
  { value: 20, label: '本気' },
  { value: 30, label: '全力' },
];
const FREE_DAILY_VALUES = [5, 10];

export function Step3Settings({ onDone }: Props) {
  const ctx = useApp();
  const updateProfile = ctx?.updateProfile;
  const { isPremium } = useRevenueCat();
  const isFree = !isPremium;

  const [interval, setIntervalMin] = useState(isFree ? 60 : 30);
  const [blocks, setBlocks] = useState<NotificationBlock[]>([{ start: 23, end: 7 }]);
  const [daily, setDaily] = useState(isFree ? 5 : 10);
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    const granted = await ensureNotificationPermission().catch(() => false);
    if (!granted) {
      setSaving(false);
      Alert.alert(
        '通知が許可されていません',
        '通知を許可しないと学習通知が届きません。設定アプリから許可してください。'
      );
      return;
    }
    if (updateProfile) {
      await updateProfile({
        notification_interval_min: interval,
        notification_blocks: blocks,
        daily_new_words: daily,
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

        {/* Interval — onboarding shows only the free options (30 / 60 min) */}
        <Text style={styles.sectionTitle}>通知間隔</Text>
        <View style={styles.chipRow}>
          {(isFree ? FREE_INTERVALS : INTERVAL_OPTIONS).map((m) => {
            const on = interval === m;
            return (
              <Pressable
                key={m}
                onPress={() => setIntervalMin(m)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{m}分</Text>
              </Pressable>
            );
          })}
        </View>
        {isFree && <Text style={styles.hint}>有料プランで5〜60分から選べます。</Text>}

        {/* Daily new words — onboarding shows only the free options (5 / 10) */}
        <Text style={styles.sectionTitle}>1日の新規単語数</Text>
        {(isFree
          ? DAILY_OPTIONS.filter((d) => FREE_DAILY_VALUES.includes(d.value))
          : DAILY_OPTIONS
        ).map((d) => {
          const on = daily === d.value;
          return (
            <Pressable
              key={d.value}
              onPress={() => setDaily(d.value)}
              style={[styles.dailyRow, on && styles.dailyRowOn]}
            >
              <Text style={[styles.dailyLabel, on && styles.dailyLabelOn]}>{d.label}</Text>
              <View style={styles.dailyRight}>
                <Text style={[styles.dailyValue, on && styles.dailyValueOn]}>{d.value}語</Text>
              </View>
            </Pressable>
          );
        })}
        {isFree && <Text style={styles.hint}>有料プランでさらに増やせます。</Text>}

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
