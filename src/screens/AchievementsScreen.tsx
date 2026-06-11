import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { Card } from '../components/Card';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../constants/colors';
import {
  getMasteredWordsList,
  getMasteryStats,
  type MasteredWordItem,
  type MasteryStats,
  type StatsRange,
} from '../lib/stats';

const RANGES: { key: StatsRange; label: string }[] = [
  { key: '7d', label: '7日' },
  { key: '30d', label: '30日' },
  { key: 'all', label: '全期間' },
];

const EMPTY: MasteryStats = {
  total: 0,
  week: 0,
  month: 0,
  learning: 0,
  labels: ['', '', '', '', '', '', ''],
  data: [0, 0, 0, 0, 0, 0, 0],
};

/** Pick a tidy integer Y-axis max + segment count (steps of 1/2/5/10…). */
function niceAxis(maxVal: number): { max: number; segments: number } {
  const m = Math.max(1, Math.ceil(maxVal));
  if (m <= 5) return { max: m, segments: m }; // 1..5 → step of 1
  const rawStep = m / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const max = Math.ceil(m / step) * step;
  return { max, segments: Math.max(1, Math.round(max / step)) };
}

function fmtMmDd(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function AchievementsScreen() {
  const [range, setRange] = useState<StatsRange>('7d');
  const [stats, setStats] = useState<MasteryStats>(EMPTY);
  const [mastered, setMastered] = useState<MasteredWordItem[]>([]);

  const load = useCallback(async (r: StatsRange) => {
    const [s, list] = await Promise.all([
      getMasteryStats(r).catch(() => EMPTY),
      getMasteredWordsList().catch(() => [] as MasteredWordItem[]),
    ]);
    setStats(s);
    setMastered(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(range);
    }, [load, range])
  );

  const onRange = (r: StatsRange) => {
    setRange(r);
    load(r);
  };

  const chartWidth = Dimensions.get('window').width - SPACING.lg * 2 - SPACING.lg * 2;
  const data = stats.data.length ? stats.data : EMPTY.data;
  const labels = stats.labels.length ? stats.labels : EMPTY.labels;
  // Nice integer Y axis (1, 2, 5, 10, … up to 1000) that scales with mastery,
  // so a single mastered word no longer renders as "0 1 1 1".
  const axis = niceAxis(Math.max(...data, 0));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.brand}>実績</Text>

        {/* Highlight: this week (yellow) */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>今週 習得しました！</Text>
          <Text style={styles.heroValue}>
            {stats.week}
            <Text style={styles.heroUnit}> 語</Text>
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Summary label="今月" value={stats.month} />
          <Summary label="合計" value={stats.total} color={COLORS.secondary} />
          <Summary label="学習中" value={stats.learning} color={COLORS.primary} />
        </View>

        <View style={styles.rangeRow}>
          {RANGES.map((r) => {
            const on = r.key === range;
            return (
              <Pressable
                key={r.key}
                onPress={() => onRange(r.key)}
                style={[styles.rangeChip, on && styles.rangeChipOn]}
              >
                <Text style={[styles.rangeText, on && styles.rangeTextOn]}>
                  {r.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={styles.chartCard} padded={false}>
          <Text style={styles.chartTitle}>習得単語数の推移</Text>
          <LineChart
            data={{
              labels,
              datasets: [
                { data, color: (o = 1) => `rgba(24, 54, 101, ${o})`, strokeWidth: 2 },
                // invisible series that pins the Y axis to a tidy integer max
                {
                  data: new Array(data.length).fill(axis.max),
                  color: () => 'rgba(0,0,0,0)',
                  withDots: false,
                },
              ],
            }}
            width={chartWidth}
            height={220}
            segments={axis.segments}
            withInnerLines={false}
            withOuterLines={false}
            fromZero
            formatYLabel={(y) => String(Math.round(Number(y)))}
            chartConfig={{
              backgroundGradientFrom: COLORS.card,
              backgroundGradientTo: COLORS.card,
              decimalPlaces: 0,
              color: (o = 1) => `rgba(24, 54, 101, ${o})`,
              labelColor: () => COLORS.textMuted,
              propsForDots: { r: '4', strokeWidth: '2', stroke: COLORS.primary },
            }}
            bezier
            style={styles.chart}
          />
        </Card>

        {/* Mastered words list */}
        <Text style={styles.sectionTitle}>習得済み単語 {mastered.length}語</Text>
        <View style={styles.masteredCard}>
          {mastered.length === 0 ? (
            <Text style={styles.masteredEmpty}>まだありません</Text>
          ) : (
            mastered.map((w, i) => (
              <View
                key={w.id}
                style={[styles.masteredRow, i > 0 && styles.masteredDivider]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.masteredEn}>{w.english}</Text>
                  <Text style={styles.masteredJa}>{w.japanese}</Text>
                </View>
                <Text style={styles.masteredDate}>{fmtMmDd(w.mastered_at)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Summary({
  label,
  value,
  color = COLORS.text,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Card style={styles.summaryCell}>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  brand: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  heroCard: {
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    ...SHADOW,
  },
  heroLabel: { color: COLORS.onPrimary, fontSize: FONT_SIZE.sm, fontWeight: '700', opacity: 0.75 },
  heroValue: {
    color: COLORS.onPrimary,
    fontSize: 48,
    fontWeight: '800',
    marginTop: SPACING.xs,
  },
  heroUnit: { fontSize: FONT_SIZE.lg, fontWeight: '700', color: COLORS.onPrimary, opacity: 0.7 },
  summaryRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  summaryCell: { flex: 1, alignItems: 'center', paddingVertical: SPACING.lg },
  summaryValue: { fontSize: FONT_SIZE.xxl, fontWeight: '800' },
  summaryLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: SPACING.xs },
  rangeRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.xl },
  rangeChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },
  rangeChipOn: { backgroundColor: COLORS.primary },
  rangeText: { color: COLORS.text, fontWeight: '600', fontSize: FONT_SIZE.sm },
  rangeTextOn: { color: COLORS.onPrimary },
  chartCard: { marginTop: SPACING.md, padding: SPACING.lg },
  chartTitle: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: FONT_SIZE.md,
    marginBottom: SPACING.md,
  },
  chart: { borderRadius: RADIUS.card, marginLeft: -SPACING.sm },
  sectionTitle: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: FONT_SIZE.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  masteredCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    paddingHorizontal: SPACING.lg,
  },
  masteredEmpty: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.lg },
  masteredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  masteredDivider: { borderTopWidth: 1, borderTopColor: COLORS.border },
  masteredEn: { color: COLORS.text, fontSize: FONT_SIZE.md, fontWeight: '700' },
  masteredJa: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: 2 },
  masteredDate: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '700' },
});
