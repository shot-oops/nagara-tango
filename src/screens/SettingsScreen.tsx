import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { NotificationBlocksEditor } from '../components/NotificationBlocksEditor';
import { LockSlider } from '../components/LockSlider';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../constants/colors';
import { useApp } from '../context/AppContext';
import { useRevenueCat } from '../hooks/useRevenueCat';
import { requestReviewManually } from '../lib/review';
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

const TERMS_URL = 'https://shot-oops.github.io/nagara-tango/terms.md';
const PRIVACY_URL = 'https://shot-oops.github.io/nagara-tango/privacy.md';
const FEEDBACK_EMAIL = 'sho.takahashi87@gmail.com';
const FEEDBACK_SUBJECT = '[ながら単語 for TOEIC]ご意見・ご要望';
const FEEDBACK_MAILTO = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
  FEEDBACK_SUBJECT
)}`;

function openUrl(url: string) {
  Linking.openURL(url).catch((e) => console.warn('[settings] openURL failed', e));
}

/** A tappable row with a label on the left and a chevron on the right. */
function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.linkRow} onPress={onPress}>
      <Text style={styles.linkRowText}>{label}</Text>
      <Text style={styles.linkRowChevron}>›</Text>
    </Pressable>
  );
}

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
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
    Alert.alert('保存しました', '設定を更新しました。');
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

  const onReview = () => {
    requestReviewManually().catch((e) =>
      console.warn('[settings] requestReview failed', e)
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>設定</Text>

        {/* ── 通知設定 ──────────────────────────────── */}
        <Text style={styles.groupTitle}>通知設定</Text>

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

        {/* ── 学習設定 ──────────────────────────────── */}
        <Text style={styles.groupTitle}>学習設定</Text>

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

        {/* ── プラン ────────────────────────────────── */}
        <Text style={styles.groupTitle}>プラン</Text>

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

        {/* ── その他 ────────────────────────────────── */}
        <Text style={styles.groupTitle}>その他</Text>

        <LinkRow label="利用規約" onPress={() => openUrl(TERMS_URL)} />
        <LinkRow label="プライバシーポリシー" onPress={() => openUrl(PRIVACY_URL)} />
        <LinkRow label="レビューする" onPress={onReview} />
        <LinkRow label="ご意見・ご要望を送る" onPress={() => openUrl(FEEDBACK_MAILTO)} />

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
      </ScrollView>

      {/* Save button fixed to the bottom of the screen. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.md }]}>
        <Button title="保存" loading={saving} onPress={onSave} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  brand: { fontSize: FONT_SIZE.xl, fontWeight: '800', color: COLORS.text },
  groupTitle: {
    marginTop: SPACING.xl,
    marginBottom: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },
  hint: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, lineHeight: 20 },
  linkRow: {
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
  linkRowText: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '600' },
  linkRowChevron: { color: COLORS.textMuted, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
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
  sectionTitle: {
    marginTop: SPACING.lg,
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
  chipText: { color: COLORS.text, fontWeight: '600' },
  chipTextOn: { color: COLORS.onPrimary },
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
