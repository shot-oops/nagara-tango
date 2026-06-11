import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../constants/colors';
import { answerWord } from '../lib/responseHandler';
import { getAllWords } from '../lib/wordRepository';
import type { MasterWord, WordStatus } from '../types';

interface Props {
  wordId: string;
  onDone: () => void;
}

type Phase = 'ask' | 'submitting' | 'answered';

/**
 * Shown when the user taps a test-mode notification. Presents the word and the
 * わかる / わからない choice in the foreground (more reliable & mis-tap-proof
 * than inline notification buttons), records the answer, then reveals the
 * meaning as feedback.
 */
export function AnswerScreen({ wordId, onDone }: Props) {
  const [word, setWord] = useState<MasterWord | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('ask');
  const [known, setKnown] = useState(false);
  const [resultStatus, setResultStatus] = useState<WordStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAllWords()
      .then((ws) => {
        if (cancelled) return;
        setWord(ws.find((w) => w && w.id === wordId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setWord(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wordId]);

  const submit = useCallback(
    async (isKnown: boolean) => {
      setPhase('submitting');
      setKnown(isKnown);
      const status = await answerWord(wordId, isKnown).catch(() => null);
      setResultStatus(status);
      setPhase('answered');
    },
    [wordId]
  );

  return (
    <View style={styles.overlay}>
      <Screen>
        <View style={styles.header}>
          <Text style={styles.step}>確認テスト</Text>
          <Text style={styles.title}>意味を覚えていますか？</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.xxl }} />
        ) : (
          <>
            <View style={styles.wordCard}>
              <Text style={styles.word}>{word?.english ?? '—'}</Text>
              {phase === 'answered' && (
                <Text style={styles.japanese}>{word?.japanese ?? ''}</Text>
              )}
            </View>

            {phase === 'answered' ? (
              <>
                <View
                  style={[
                    styles.resultBadge,
                    { backgroundColor: known ? COLORS.secondary : COLORS.primary },
                  ]}
                >
                  <Text style={styles.resultText}>
                    {resultStatus === 'mastered'
                      ? '🎉 習得済みになりました！'
                      : known
                        ? '✅ 「わかる」で記録しました'
                        : '❌ 「わからない」で記録しました'}
                  </Text>
                </View>
                <Text style={styles.hint}>
                  {resultStatus === 'mastered'
                    ? 'この単語は習得済みです。今後の通知には出ません。'
                    : known
                      ? '正解として記録し、次回の出題を先に延ばしました。'
                      : '復習キューに戻しました。近いうちにまた出題します。'}
                </Text>
                <View style={{ flex: 1 }} />
                <Button title="閉じる" onPress={onDone} />
              </>
            ) : (
              <>
                <View style={{ flex: 1 }} />
                <Button
                  title="✅ わかる"
                  loading={phase === 'submitting'}
                  onPress={() => submit(true)}
                />
                <Button
                  title="❌ わからない"
                  variant="outline"
                  onPress={() => submit(false)}
                  style={{ marginTop: SPACING.sm }}
                />
              </>
            )}
          </>
        )}
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    zIndex: 100,
  },
  header: { paddingTop: SPACING.md },
  step: { color: COLORS.primary, fontWeight: '700', fontSize: FONT_SIZE.sm },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  wordCard: {
    marginTop: SPACING.xl,
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
  },
  word: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  japanese: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.primary,
    fontWeight: '700',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  resultBadge: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  resultText: { color: COLORS.onPrimary, fontWeight: '700', fontSize: FONT_SIZE.md },
  hint: {
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    marginTop: SPACING.md,
    textAlign: 'center',
    lineHeight: 20,
  },
});
