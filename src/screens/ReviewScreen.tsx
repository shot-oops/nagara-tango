import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { QuizModal } from '../components/QuizModal';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../constants/colors';
import { getUserWordsMap } from '../lib/storage';
import { getAllWords } from '../lib/wordRepository';
import { answerWord } from '../lib/responseHandler';
import type { Difficulty, MasterWord, UserWord, WordStatus } from '../types';

type Filter = 'all' | 'due' | 'learning' | 'mastered';

interface Item {
  word: MasterWord;
  uw: UserWord;
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'due', label: '要復習' },
  { key: 'learning', label: '学習中' },
  { key: 'mastered', label: '習得済み' },
];

const DIFF_BADGE: Record<Difficulty, string> = {
  2: '500点',
  3: '700点',
  4: '860点',
  5: '990点',
};

const STATUS_LABEL: Record<WordStatus, string> = {
  new: '未学習',
  learning: '学習中',
  known: '習得済み',
  mastered: '習得済み',
};

const isDue = (uw: UserWord, now: number) =>
  new Date(uw.next_display_at).getTime() <= now;

export function ReviewScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [pool, setPool] = useState<MasterWord[]>([]);
  const [filter, setFilter] = useState<Filter>('due');
  const [quizWord, setQuizWord] = useState<MasterWord | null>(null);

  const load = useCallback(async () => {
    const [master, userWords] = await Promise.all([
      getAllWords().catch(() => [] as MasterWord[]),
      getUserWordsMap().catch(() => ({}) as Record<string, UserWord>),
    ]);
    const byId = new Map<string, MasterWord>();
    for (const w of master) if (w && w.id) byId.set(w.id, w);
    const next: Item[] = [];
    for (const uw of Object.values(userWords)) {
      if (!uw || typeof uw !== 'object') continue;
      const word = byId.get(uw.word_id);
      if (word) next.push({ word, uw });
    }
    setPool(master);
    setItems(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const now = Date.now();

  const stats = useMemo(() => {
    let learning = 0;
    let due = 0;
    let mastered = 0;
    for (const it of items) {
      if (it.uw.status === 'mastered') mastered += 1;
      else if (it.uw.status === 'learning' || it.uw.status === 'new') learning += 1;
      if (it.uw.status !== 'mastered' && isDue(it.uw, now)) due += 1;
    }
    return { learning, due, mastered };
  }, [items, now]);

  const visible = useMemo(() => {
    const rank = (it: Item) => {
      if (it.uw.status === 'mastered') return 2;
      if (isDue(it.uw, now)) return 0;
      return 1;
    };
    const filtered = items.filter((it) => {
      if (filter === 'all') return true;
      if (filter === 'due') return it.uw.status !== 'mastered' && isDue(it.uw, now);
      if (filter === 'learning')
        return it.uw.status === 'learning' || it.uw.status === 'new';
      return it.uw.status === 'mastered';
    });
    return filtered.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      return (
        new Date(a.uw.next_display_at).getTime() -
        new Date(b.uw.next_display_at).getTime()
      );
    });
  }, [items, filter, now]);

  const excludeIds = useMemo(
    () => new Set(items.map((it) => it.word.id)),
    [items]
  );

  const onAnswered = (wordId: string, correct: boolean) => {
    answerWord(wordId, correct).catch((e) =>
      console.warn('[review] answerWord failed', e)
    );
  };

  const renderItem = ({ item }: { item: Item }) => (
    <Pressable style={styles.card} onPress={() => setQuizWord(item.word)}>
      <View style={styles.cardTop}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{DIFF_BADGE[item.word.difficulty_level]}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{STATUS_LABEL[item.uw.status]}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <Text style={styles.english}>{item.word.english}</Text>
        <Text style={styles.quizHint}>クイズ →</Text>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={visible}
        keyExtractor={(it) => it.word.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <Text style={styles.brand}>復習</Text>
            <View style={styles.statsRow}>
              <Stat label="学習中" value={stats.learning} color={COLORS.text} />
              <Stat label="要復習" value={stats.due} color={COLORS.danger} />
              <Stat label="習得済み" value={stats.mastered} color={COLORS.primary} />
            </View>
            <View style={styles.filterRow}>
              {FILTERS.map((f) => {
                const on = f.key === filter;
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => setFilter(f.key)}
                    style={[styles.filterChip, on && styles.filterChipOn]}
                  >
                    <Text style={[styles.filterText, on && styles.filterTextOn]}>
                      {f.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>該当する単語はありません</Text>
        }
      />

      <QuizModal
        visible={quizWord !== null}
        word={quizWord}
        pool={pool}
        excludeIds={excludeIds}
        onClose={() => {
          setQuizWord(null);
          load();
        }}
        onAnswered={onAnswered}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.lg, paddingBottom: SPACING.xxl },
  brand: { fontSize: FONT_SIZE.xxl, fontWeight: '800', color: COLORS.primary, marginBottom: SPACING.lg },
  statsRow: { flexDirection: 'row', gap: SPACING.md },
  statCell: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  statValue: { fontSize: FONT_SIZE.xxl, fontWeight: '800' },
  statLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surface,
  },
  filterChipOn: { backgroundColor: COLORS.primary },
  filterText: { color: COLORS.text, fontWeight: '700', fontSize: FONT_SIZE.sm },
  filterTextOn: { color: COLORS.onPrimary },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  badge: {
    backgroundColor: COLORS.primaryDark + '22',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  badgeText: { color: COLORS.primary, fontSize: FONT_SIZE.xs, fontWeight: '800' },
  statusBadge: {},
  statusText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, fontWeight: '700' },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  english: { color: COLORS.text, fontSize: FONT_SIZE.xl, fontWeight: '800', flex: 1 },
  quizHint: { color: COLORS.primary, fontSize: FONT_SIZE.sm, fontWeight: '800' },
  empty: { color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xxl },
});
