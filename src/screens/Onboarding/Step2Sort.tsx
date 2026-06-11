import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/Button';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../../constants/colors';
import { useVocabularyTest } from '../../hooks/useVocabularyTest';
import { bulkSetUserWords, makeNewUserWord } from '../../lib/storage';
import { TOEIC_LEVEL_LABEL } from '../../types';
import type { LevelTier, VocabLevel, VocabTestResult } from '../../types';

interface Props {
  onNext: () => void;
}

const TIER_LABEL: Record<LevelTier, string> = {
  beginner: '初級 (500点レベル)',
  intermediate: '中級 (700点レベル)',
  advanced: '上級 (860-990点レベル)',
};

const LEVEL_MESSAGE: Record<VocabLevel, string> = {
  2: 'まずは基礎固めから始めよう！',
  3: '実務で使えるレベルを目指そう！',
  4: 'ハイスコアまであと一歩！',
  5: 'トップレベルの実力！',
};

const FEEDBACK_MS = 700;

async function persistResultsAsUserWords(result: VocabTestResult): Promise<void> {
  if (!result || !Array.isArray(result.answers)) return;
  const userWords = result.answers
    .filter((a) => a && a.wordId)
    .map((a) =>
      makeNewUserWord(a.wordId, { status: 'learning', display_count: 0 })
    );
  if (userWords.length > 0) await bulkSetUserWords(userWords);
}

export function Step2Sort({ onNext }: Props) {
  const test = useVocabularyTest();

  if (!test || test.status === 'loading') {
    return (
      <Screen>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xxl }} />
        <Text style={styles.loadingText}>診断問題を準備中…</Text>
      </Screen>
    );
  }

  if (test.status === 'error') {
    return (
      <Screen>
        <Text style={styles.title}>診断テストを開始できません</Text>
        <Text style={styles.subtitle}>
          {test.errorMessage ?? '不明なエラーが発生しました。'}
        </Text>
        <View style={{ flex: 1 }} />
        <Button title="スキップして続ける" variant="outline" onPress={onNext} />
      </Screen>
    );
  }

  if (test.status === 'done' && test.result) {
    return (
      <DoneView
        result={test.result}
        onNext={async () => {
          await persistResultsAsUserWords(test.result!).catch((e) =>
            console.warn('[vocabTest] persist failed', e)
          );
          onNext();
        }}
      />
    );
  }

  return <QuestionView test={test} />;
}

function QuestionView({ test }: { test: ReturnType<typeof useVocabularyTest> }) {
  const [locked, setLocked] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const q = test.question;
  if (!q || !q.word || !Array.isArray(q.choices)) {
    return (
      <Screen>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xxl }} />
      </Screen>
    );
  }

  const onChoose = (i: number) => {
    if (locked !== null) return;
    setLocked(i);
    timer.current = setTimeout(() => {
      setLocked(null);
      test.answer(i);
    }, FEEDBACK_MS);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.step}>
          診断テスト ・ {test.index + 1} / {test.total}
        </Text>
        {/* segmented progress bar */}
        <View style={styles.segmentRow}>
          {Array.from({ length: test.total }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                i <= test.index && styles.segmentFilled,
              ]}
            />
          ))}
        </View>
        <Text style={styles.subtitle}>
          {`第${test.currentBlock + 1}ブロック ・ ${TIER_LABEL[test.currentTier]}`}
        </Text>
      </View>

      <View style={styles.wordCard}>
        <Text style={styles.word}>{q.word.english}</Text>
      </View>

      <View style={styles.choices}>
        {q.choices.map((c, i) => (
          <AnswerChoice
            key={`${test.index}-${i}`}
            label={c}
            state={
              locked === null
                ? 'idle'
                : i === q.correctIndex
                  ? 'correct'
                  : i === locked
                    ? 'wrong'
                    : 'dim'
            }
            disabled={locked !== null}
            onPress={() => onChoose(i)}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title="この問題はスキップ"
          variant="ghost"
          onPress={() => {
            if (locked === null) test.answer(-1);
          }}
        />
      </View>
    </Screen>
  );
}

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'dim';

function AnswerChoice({
  label,
  state,
  disabled,
  onPress,
}: {
  label: string;
  state: ChoiceState;
  disabled: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40 }).start();

  const bg =
    state === 'correct'
      ? COLORS.success
      : state === 'wrong'
        ? COLORS.danger
        : COLORS.card;
  const borderColor =
    state === 'correct'
      ? COLORS.success
      : state === 'wrong'
        ? COLORS.danger
        : COLORS.surface;
  const textColor = state === 'correct' || state === 'wrong' ? COLORS.white : COLORS.text;
  const opacity = state === 'dim' ? 0.5 : 1;

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Pressable
        disabled={disabled}
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        onPress={onPress}
        style={[styles.choice, { backgroundColor: bg, borderColor }]}
      >
        <Text style={[styles.choiceText, { color: textColor }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

function DoneView({
  result,
  onNext,
}: {
  result: VocabTestResult;
  onNext: () => void;
}) {
  return (
    <Screen>
      <ConfettiCannon
        count={120}
        origin={{ x: -10, y: 0 }}
        fadeOut
        autoStart
        fallSpeed={2500}
        colors={['#183665', '#FFFFFF', '#5C7AA8', '#AEC2DD']}
      />
      <View style={styles.header}>
        <Text style={styles.step}>診断完了！</Text>
        <Text style={styles.title}>診断結果</Text>
      </View>

      <View style={styles.resultCard}>
        <Text style={styles.resultLabel}>あなたの語彙レベル</Text>
        <Text style={styles.resultLevel}>{TOEIC_LEVEL_LABEL[result.level]}</Text>
      </View>

      <Text style={styles.resultMessage}>{LEVEL_MESSAGE[result.level]}</Text>
      <Text style={styles.resultHint}>
        このレベルを基準に、最適な難易度の単語を中心に通知します。
      </Text>

      <View style={{ flex: 1 }} />
      <Button title="次へ" onPress={onNext} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: SPACING.md },
  step: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.sm },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  subtitle: { color: COLORS.textMuted, marginTop: SPACING.sm, fontSize: FONT_SIZE.sm },
  loadingText: { textAlign: 'center', color: COLORS.textMuted, marginTop: SPACING.md },
  segmentRow: { flexDirection: 'row', gap: 2, marginTop: SPACING.md },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surface,
  },
  segmentFilled: { backgroundColor: COLORS.primary },
  wordCard: {
    marginTop: SPACING.xl,
    padding: SPACING.xl,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.card,
    alignItems: 'center',
    ...SHADOW,
  },
  word: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  choices: { marginTop: SPACING.xl, gap: SPACING.sm },
  choice: {
    padding: SPACING.lg,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.surface,
  },
  choiceText: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '700' },
  footer: { marginTop: SPACING.xl },
  resultCard: {
    marginTop: SPACING.xl,
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    ...SHADOW,
  },
  resultLabel: { color: COLORS.onPrimary, fontSize: FONT_SIZE.sm, fontWeight: '700', opacity: 0.7 },
  resultLevel: {
    color: COLORS.onPrimary,
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '800',
    marginTop: SPACING.sm,
  },
  resultScore: { color: COLORS.onPrimary, fontSize: FONT_SIZE.md, marginTop: SPACING.xs, opacity: 0.8 },
  resultMessage: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.lg,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  resultHint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
});
