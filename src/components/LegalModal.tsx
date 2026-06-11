import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT_SIZE, SPACING } from '../constants/colors';
import { PRIVACY, TERMS } from '../constants/legal';

export type LegalWhich = 'terms' | 'privacy' | null;

export function LegalModal({
  which,
  onClose,
}: {
  which: LegalWhich;
  onClose: () => void;
}) {
  const doc = which === 'terms' ? TERMS : which === 'privacy' ? PRIVACY : null;

  return (
    <Modal
      visible={!!doc}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>{doc?.title ?? ''}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>閉じる</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {doc?.sections.map((s, i) => (
            <View key={i} style={styles.section}>
              <Text style={styles.h}>{s.h}</Text>
              <Text style={styles.b}>{s.b}</Text>
            </View>
          ))}
          <View style={{ height: SPACING.xl }} />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: FONT_SIZE.lg, fontWeight: '800', color: COLORS.text },
  close: { color: COLORS.primary, fontSize: FONT_SIZE.md, fontWeight: '700' },
  content: { padding: SPACING.lg },
  section: { marginBottom: SPACING.lg },
  h: { fontSize: FONT_SIZE.md, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.xs },
  b: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, lineHeight: 22 },
});
