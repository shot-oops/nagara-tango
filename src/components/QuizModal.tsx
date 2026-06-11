import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { pickDistractors } from '../lib/vocabularyTest';
import { COLORS, FONT_SIZE, RADIUS, SPACING, SHADOW } from '../constants/colors';
import type { MasterWord } from '../types';

interface Props {
  visible: boolean;
  word: MasterWord | null;
  /** Full word pool to draw distractors from. */
  pool: MasterWord[];
  /** Word ids to exclude from distractors (e.g. the whole review list). */
  excludeIds: Set<string>;
  onClose: () => void;
  onAnswered: (wordId: string, correct: boolean) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const o = arr.slice();
  for (let i = o.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  return o;
}

export function QuizModal({
  visible,
  word,
  pool,
  excludeIds,
  onClose,
  onAnswered,
}: Props) {
  const [picked, setPicked] = useState<number | null>(null);

  const quiz = useMemo(() => {
    if (!word) return null;
    const distractors = pickDistractors(word, pool, excludeIds, 3);
    const choices = shuffle([word.japanese, ...distractors.map((d) => d.japanese)]);
    while (choices.length < 4) choices.push('—');
    return { choices, correctIndex: choices.indexOf(word.japanese) };
  }, [word, pool, excludeIds]);

  useEffect(() => {
    if (visible) setPicked(null);
  }, [visible, word?.id]);

  const onPick = (i: number) => {
    if (picked !== null || !word || !quiz) return;
    setPicked(i);
    const correct = i === quiz.correctIndex;
    onAnswered(word.id, correct);
    setTimeout(onClose, correct ? 800 : 1500);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.label}>意味を選んでください</Text>
          <Text style={styles.word}>{word?.english ?? ''}</Text>

          <View style={styles.choices}>
            {quiz?.choices.map((c, i) => {
              const state =
                picked === null
                  ? 'idle'
                  : i === quiz.correctIndex
                    ? 'correct'
                    : i === picked
                      ? 'wrong'
                      : 'dim';
              const bg =
                state === 'correct'
                  ? COLORS.success
                  : state === 'wrong'
                    ? COLORS.danger
                    : COLORS.surface;
              const txt =
                state === 'correct' || state === 'wrong' ? COLORS.white : COLORS.text;
              return (
                <Pressable
                  key={i}
                  disabled={picked !== null}
                  onPress={() => onPick(i)}
                  style={[
                    styles.choice,
                    { backgroundColor: bg, opacity: state === 'dim' ? 0.5 : 1 },
                  ]}
                >
                  <Text style={[styles.choiceText, { color: txt }]}>{c}</Text>
                </Pressable>
              );
            })}
          </View>

          {picked === null && (
            <Pressable onPress={onClose} style={styles.cancel}>
              <Text style={styles.cancelText}>とじる</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOW,
  },
  label: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm, fontWeight: '600' },
  word: {
    color: COLORS.text,
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  choices: { gap: SPACING.sm },
  choice: {
    padding: SPACING.lg,
    borderRadius: RADIUS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  choiceText: { fontSize: FONT_SIZE.md, fontWeight: '700' },
  cancel: { alignItems: 'center', paddingVertical: SPACING.md, marginTop: SPACING.sm },
  cancelText: { color: COLORS.textMuted, fontWeight: '600' },
});
