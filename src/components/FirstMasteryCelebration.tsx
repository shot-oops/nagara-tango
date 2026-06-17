import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RocketKun } from './characters';
import { Button } from './Button';
import { COLORS, FONT_SIZE, SPACING } from '../constants/colors';

interface Props {
  visible: boolean;
  /** Tapping the primary button: dismiss the celebration, then show the
   * App Store review dialog. */
  onContinue: () => void;
}

/**
 * One-time celebration shown the first time a word reaches 'mastered'. Acts as a
 * warm-up screen before the App Store review dialog (handled by the caller).
 * Rendered as a full-screen overlay (not a Modal) so it appears cleanly once any
 * open quiz Modal has dismissed.
 */
export function FirstMasteryCelebration({ visible, onContinue }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.content}>
          <RocketKun size={160} />
          <Text style={styles.title}>やったね！🎉</Text>
          <Text style={styles.body}>最初の単語、ばっちり覚えられたね</Text>
        </View>
        <View style={styles.footer}>
          <Button title="つづける" onPress={onContinue} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    zIndex: 200,
  },
  safe: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  body: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
});
