import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from './Button';
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '../constants/colors';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

interface Props {
  visible: boolean;
  hour: number;
  minute: number;
  onCancel: () => void;
  onConfirm: (hour: number, minute: number) => void;
}

const pad = (n: number) => `${n}`.padStart(2, '0');

export function TimePickerModal({ visible, hour, minute, onCancel, onConfirm }: Props) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);

  useEffect(() => {
    if (visible) {
      setH(hour);
      // snap to nearest 5-min option
      setM(MINUTES.reduce((a, b) => (Math.abs(b - minute) < Math.abs(a - minute) ? b : a), 0));
    }
  }, [visible, hour, minute]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} />
      <View style={styles.sheet}>
        <Text style={styles.title}>時間を選択</Text>
        <Text style={styles.preview}>{pad(h)}:{pad(m)}</Text>

        <View style={styles.columns}>
          <View style={styles.col}>
            <Text style={styles.colLabel}>時</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.colScroll}>
              {HOURS.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setH(v)}
                  style={[styles.cell, v === h && styles.cellOn]}
                >
                  <Text style={[styles.cellText, v === h && styles.cellTextOn]}>{pad(v)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.col}>
            <Text style={styles.colLabel}>分</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.colScroll}>
              {MINUTES.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setM(v)}
                  style={[styles.cell, v === m && styles.cellOn]}
                >
                  <Text style={[styles.cellText, v === m && styles.cellTextOn]}>{pad(v)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>

        <Button title="決定" onPress={() => onConfirm(h, m)} />
        <Pressable onPress={onCancel} style={styles.cancel}>
          <Text style={styles.cancelText}>キャンセル</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  title: { color: COLORS.text, fontWeight: '800', fontSize: FONT_SIZE.lg, textAlign: 'center' },
  preview: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 40,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  columns: { flexDirection: 'row', gap: SPACING.lg, marginVertical: SPACING.md },
  col: { flex: 1 },
  colLabel: { color: COLORS.textMuted, textAlign: 'center', fontSize: FONT_SIZE.sm, marginBottom: SPACING.xs },
  colScroll: { height: 180 },
  cell: { paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: RADIUS.md, marginBottom: SPACING.xs },
  cellOn: { backgroundColor: COLORS.primary },
  cellText: { color: COLORS.text, fontSize: FONT_SIZE.lg, fontWeight: '600' },
  cellTextOn: { color: COLORS.onPrimary, fontWeight: '800' },
  cancel: { alignItems: 'center', paddingVertical: SPACING.md, marginTop: SPACING.xs },
  cancelText: { color: COLORS.textMuted, fontSize: FONT_SIZE.md, fontWeight: '600' },
});
