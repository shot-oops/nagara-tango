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
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../../constants/colors';
import type { VocabLevel } from '../../types';

interface Props {
  onFirstTimer: () => void;
  onScored: (level: VocabLevel, score: number) => void;
  onBack: () => void;
}

/** TOEIC score → internal difficulty level. */
export function scoreToLevel(score: number): VocabLevel {
  if (score <= 495) return 2;
  if (score <= 650) return 3;
  if (score <= 795) return 4;
  return 5;
}

const SCORES: number[] = (() => {
  const out: number[] = [];
  for (let s = 300; s <= 990; s += 30) out.push(s);
  return out;
})();

export function ToeicScoreScreen({ onFirstTimer, onScored, onBack }: Props) {
  const [step, setStep] = useState<'A' | 'B'>('A');
  const [score, setScore] = useState<number | null>(null);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header: back + progress */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (step === 'B' ? setStep('A') : onBack())}
          hitSlop={10}
        >
          <Text style={styles.back}>‹</Text>
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: step === 'A' ? '40%' : '70%' }]} />
        </View>
      </View>

      {step === 'A' ? (
        <View style={styles.body}>
          <Text style={styles.heading}>TOEICの受験経験は？</Text>
          <Text style={styles.sub}>適切なレベルから始めるために教えてください</Text>

          <View style={{ height: SPACING.xl }} />
          <Pressable style={styles.choice} onPress={() => setStep('B')}>
            <Text style={styles.choiceText}>あります</Text>
          </Pressable>
          <Pressable style={styles.choice} onPress={onFirstTimer}>
            <Text style={styles.choiceText}>いいえ、初めてです</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={styles.heading}>直近のTOEICスコアは？</Text>
          <Text style={styles.sub}>わからなければ近い数値でOK</Text>

          <ScrollView
            style={styles.scoreList}
            contentContainerStyle={styles.scoreListContent}
            showsVerticalScrollIndicator={false}
          >
            {SCORES.map((s) => {
              const on = s === score;
              return (
                <Pressable
                  key={s}
                  onPress={() => setScore(s)}
                  style={[styles.scoreRow, on && styles.scoreRowOn]}
                >
                  <Text style={[styles.scoreText, on && styles.scoreTextOn]}>
                    {s} 点
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title="つぎへ"
              disabled={score === null}
              onPress={() => {
                if (score === null) return;
                onScored(scoreToLevel(score), score);
              }}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  back: { color: COLORS.text, fontSize: 34, lineHeight: 34, fontWeight: '700' },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  body: { flex: 1, paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  heading: { color: COLORS.text, fontSize: FONT_SIZE.xxl, fontWeight: '800' },
  sub: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, marginTop: SPACING.sm },
  choice: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  choiceText: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  scoreList: { flex: 1, marginTop: SPACING.lg },
  scoreListContent: { paddingBottom: SPACING.lg },
  scoreRow: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.card,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  scoreRowOn: { backgroundColor: COLORS.primary },
  scoreText: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '700' },
  scoreTextOn: { color: COLORS.onPrimary },
  footer: { paddingTop: SPACING.md, paddingBottom: SPACING.sm },
});
