import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { NotificationBlocksEditor } from '../components/NotificationBlocksEditor';
import { LockSlider } from '../components/LockSlider';
import { LegalModal, type LegalWhich } from '../components/LegalModal';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { getVocabTestResult, setVocabLevel } from '../lib/storage';
import { TOEIC_LEVEL_LABEL } from '../types';
import type { NotificationBlock, VocabLevel } from '../types';

const LEVEL_OPTIONS: VocabLevel[] = [2, 3, 4, 5];
const MIN_INTERVAL = 5;
const MAX_INTERVAL = 60;
const FREE_MIN_INTERVAL = 30; // free: 30〜60分（30分未満は有料）
const MIN_DAILY = 5;
const MAX_DAILY = 30;
const FREE_MAX_DAILY = 10; // free: 5〜10語（11語以上は有料）

interface Props {
  onClose: () => void;
}

export function SettingsScreen({ onClose }: Props) {
  const ctx = useApp();
  const profile = ctx?.profile;
  const updateProfile = ctx?.updateProfile;
  const refreshPlan = ctx?.refreshPlan;
  const {
    isPremium,
    purchaseMonthly,
    purchaseYearly,
    restorePurchases,
    setDevPremium,
  } = useRevenueCat();
  const [interval, setInterval] = useState(
    profile?.notification_interval_min ?? 60
  );
  const [blocks, setBlocks] = useState<NotificationBlock[]>(
    Array.isArray(profile?.notification_blocks) ? profile.notification_blocks : []
  );
  const [level, setLevel] = useState<VocabLevel | null>(null);
  const [daily, setDaily] = useState(profile?.daily_new_words ?? 10);
  const [saving, setSaving] = useState(false);
  const [legal, setLegal] = useState<LegalWhich>(null);

  const isFree = !isPremium;

  // Free users are limited to ≥30 min and ≤10 words; premium unlocks the rest.
  const intAllowedMin = isPremium ? MIN_INTERVAL : FREE_MIN_INTERVAL;
  const dayAllowedMax = isPremium ? MAX_DAILY : FREE_MAX_DAILY;
  const dispInterval = Math.max(intAllowedMin, Math.min(MAX_INTERVAL, interval));
  const dispDaily = Math.max(MIN_DAILY, Math.min(dayAllowedMax, daily));

  useEffect(() => {
    getVocabTestResult()
      .then((r) => setLevel(r?.level ?? null))
      .catch(() => setLevel(null));
  }, []);

  const onSave = async () => {
    if (!updateProfile) return;
    setSaving(true);
    await updateProfile({
      notification_interval_min: dispInterval,
      notification_blocks: blocks,
      daily_new_words: dispDaily,
    }).catch((e) => console.warn('[settings] save failed', e));
    setSaving(false);
    onClose();
  };

  const onPickLevel = async (l: VocabLevel) => {
    setLevel(l);
    await setVocabLevel(l).catch((e) =>
      console.warn('[settings] setVocabLevel failed', e)
    );
  };

  const onBuy = async (kind: 'monthly' | 'annual') => {
    if (kind === 'monthly') await purchaseMonthly();
    else await purchaseYearly();
    if (refreshPlan) await refreshPlan().catch(() => {});
  };

  const onRestore = async () => {
    await restorePurchases();
    if (refreshPlan) await refreshPlan().catch(() => {});
  };

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={styles.close}>← 戻る</Text>
        </Pressable>
        <Text style={styles.brand}>設定</Text>
        <View style={{ width: 64 }} />
      </View>

      <View style={styles.sliderHead}>
        <Text style={styles.sectionTitle}>通知間隔</Text>
        <Text style={styles.sliderValue}>{dispInterval}分ごと</Text>
      </View>
      <LockSlider
        min={MIN_INTERVAL}
        max={MAX_INTERVAL}
        step={1}
        value={dispInterval}
        onChange={setInterval}
        allowedMin={intAllowedMin}
        allowedMax={MAX_INTERVAL}
      />
      {isFree && <Text style={styles.hint}>🔒 30分未満は有料プランで解放（無料は30〜60分）</Text>}

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

      <Text style={styles.sectionTitle}>通知しない時間帯</Text>
      <NotificationBlocksEditor blocks={blocks} onChange={setBlocks} />

      <Text style={styles.sectionTitle}>語彙レベル</Text>
      <Text style={styles.hint}>
        出題される単語の中心レベルです。いつでも変更できます。
      </Text>
      <View style={[styles.chipRow, { marginTop: SPACING.sm, flexWrap: 'wrap' }]}>
        {LEVEL_OPTIONS.map((l) => {
          const selected = level === l;
          return (
            <Pressable
              key={l}
              onPress={() => onPickLevel(l)}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                {TOEIC_LEVEL_LABEL[l]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>プラン</Text>
      <View style={styles.planCard}>
        <Text style={styles.planLabel}>現在のプラン</Text>
        <Text style={styles.planValue}>{isFree ? '無料プラン' : '有料プラン'}</Text>
      </View>

      {isFree && (
        <>
          <Text style={styles.planPlusTitle}>ながら単語 Plusプラン</Text>
          <Text style={[styles.hint, { marginTop: 2 }]}>通知間隔・新規単語数を解放</Text>

          {/* Annual (best value) */}
          <Pressable style={styles.planOption} onPress={() => onBuy('annual')}>
            <View style={{ flex: 1 }}>
              <View style={styles.planOptionTop}>
                <Text style={styles.planOptionName}>年額プラン</Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>4ヶ月分無料</Text>
                </View>
              </View>
              <Text style={styles.planOptionSub}>¥3,900 / 年（¥325/月相当）</Text>
            </View>
            <Text style={styles.planOptionCta}>選ぶ ›</Text>
          </Pressable>

          {/* Monthly */}
          <Pressable
            style={[styles.planOption, styles.planOptionPlain]}
            onPress={() => onBuy('monthly')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.planOptionName}>月額プラン</Text>
              <Text style={styles.planOptionSub}>¥490 / 月</Text>
            </View>
            <Text style={styles.planOptionCta}>選ぶ ›</Text>
          </Pressable>
        </>
      )}

      <Button
        title="購入を復元"
        variant="ghost"
        onPress={onRestore}
        style={{ marginTop: SPACING.sm }}
      />

      <Text style={styles.sectionTitle}>規約・ポリシー</Text>
      <Pressable style={styles.legalRow} onPress={() => setLegal('terms')}>
        <Text style={styles.legalRowText}>利用規約</Text>
        <Text style={styles.legalRowChevron}>›</Text>
      </Pressable>
      <Pressable style={styles.legalRow} onPress={() => setLegal('privacy')}>
        <Text style={styles.legalRowText}>プライバシーポリシー</Text>
        <Text style={styles.legalRowChevron}>›</Text>
      </Pressable>

      {__DEV__ && (
        <View style={styles.debugCard}>
          <Text style={styles.debugTitle}>DEBUG</Text>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>プレミアム強制ON</Text>
            <Switch
              value={isPremium}
              onValueChange={(v) => setDevPremium(v)}
              trackColor={{ false: '#555', true: COLORS.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
      )}

      <View style={{ height: SPACING.xl }} />
      <Button title="保存" loading={saving} onPress={onSave} />

      <LegalModal which={legal} onClose={() => setLegal(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  close: { color: COLORS.primary, fontSize: FONT_SIZE.md, fontWeight: '600' },
  brand: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text },
  hint: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 20 },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  legalRowText: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  legalRowChevron: { color: COLORS.textMuted, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  debugCard: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: '#1A1A1A',
  },
  debugTitle: {
    color: '#9CA3AF',
    fontSize: FONT_SIZE.xs,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  debugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debugLabel: { color: '#E5E7EB', fontSize: FONT_SIZE.sm, fontWeight: '600' },
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
  dailyLabel: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZE.md },
  dailyLabelOn: { color: COLORS.primary },
  dailyRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  dailyValue: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONT_SIZE.md },
  dailyValueOn: { color: COLORS.primary },
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
  chipRow: { flexDirection: 'row', gap: SPACING.sm, paddingVertical: SPACING.xs },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    marginRight: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  chipOn: { backgroundColor: COLORS.primary },
  chipLocked: { opacity: 0.6 },
  chipText: { color: COLORS.text, fontWeight: '600' },
  chipTextOn: { color: COLORS.onPrimary },
  lockText: { fontSize: FONT_SIZE.xs },
  planCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surface,
  },
  planLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm },
  planValue: {
    color: COLORS.text,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    marginTop: SPACING.xs,
  },
  planPlusTitle: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.md,
    fontWeight: '800',
    marginTop: SPACING.md,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    marginTop: SPACING.sm,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  planOptionPlain: { borderColor: COLORS.border },
  planOptionTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  planOptionName: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '800' },
  planOptionSub: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 2 },
  planOptionCta: { color: COLORS.primary, fontSize: FONT_SIZE.md, fontWeight: '800' },
  saveBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  saveBadgeText: { color: COLORS.onPrimary, fontSize: FONT_SIZE.xs, fontWeight: '800' },
});
