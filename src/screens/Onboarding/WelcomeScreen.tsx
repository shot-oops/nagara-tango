import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { LegalModal, type LegalWhich } from '../../components/LegalModal';
import { colors } from '../../theme/colors';
import { FONT_SIZE, SPACING } from '../../constants/colors';

interface Props {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: Props) {
  const [legal, setLegal] = useState<LegalWhich>(null);

  return (
    <View style={styles.root}>
      {/* Yellow hero */}
      <SafeAreaView style={styles.hero} edges={['top']}>
        <View style={styles.heroInner}>
          <Text style={styles.thanks}>
            インストール{'\n'}ありがとうございます！
          </Text>
          <Text style={styles.appName}>
            ながら単語{'\n'}
            <Text style={styles.appNameSmall}>for TOEIC</Text>
          </Text>
        </View>
      </SafeAreaView>

      {/* Dark footer */}
      <SafeAreaView style={styles.footer} edges={['bottom']}>
        <View style={styles.footerInner}>
          <Button title="はじめる" onPress={onStart} />
          <Text style={styles.legal}>
            「はじめる」を押すと
            <Text style={styles.link} onPress={() => setLegal('terms')}>
              利用規約
            </Text>
            と
            <Text style={styles.link} onPress={() => setLegal('privacy')}>
              プライバシーポリシー
            </Text>
            に同意したものとみなします。
          </Text>
        </View>
      </SafeAreaView>

      <LegalModal which={legal} onClose={() => setLegal(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  hero: { flex: 1, backgroundColor: colors.primary },
  heroInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  thanks: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.onPrimary,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: SPACING.xl,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.onPrimary,
    textAlign: 'center',
    lineHeight: 44,
  },
  appNameSmall: {
    fontSize: 22,
    fontWeight: '700',
  },
  footer: { backgroundColor: colors.background },
  footerInner: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    alignItems: 'center',
  },
  legal: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
  },
});
