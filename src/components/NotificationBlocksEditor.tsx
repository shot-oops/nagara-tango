import React, { useState } from 'react';
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
import { formatBlock } from '../lib/notificationBlocks';
import type { NotificationBlock } from '../types';

interface Props {
  blocks: NotificationBlock[];
  onChange: (next: NotificationBlock[]) => void;
  maxBlocks?: number;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function NotificationBlocksEditor({
  blocks,
  onChange,
  maxBlocks = 3,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStart, setPickerStart] = useState(23);
  const [pickerEnd, setPickerEnd] = useState(7);

  const addBlock = () => {
    if (blocks.length >= maxBlocks) return;
    onChange([...blocks, { start: pickerStart, end: pickerEnd }]);
    setPickerOpen(false);
  };

  const removeBlock = (idx: number) => {
    onChange(blocks.filter((_, i) => i !== idx));
  };

  return (
    <View>
      <Timeline blocks={blocks} />

      <View style={{ height: SPACING.md }} />

      {blocks.map((b, idx) => (
        <View key={`${b.start}-${b.end}-${idx}`} style={styles.blockRow}>
          <Text style={styles.blockText}>{formatBlock(b)}</Text>
          <Pressable
            hitSlop={10}
            onPress={() => removeBlock(idx)}
            style={styles.removeBtn}
          >
            <Text style={styles.removeText}>削除</Text>
          </Pressable>
        </View>
      ))}

      {blocks.length < maxBlocks && (
        <Button
          title="＋ 通知しない時間帯を追加"
          variant="outline"
          onPress={() => setPickerOpen(true)}
          style={{ marginTop: SPACING.md }}
        />
      )}

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>通知しない時間帯を追加</Text>

            <Text style={styles.modalLabel}>開始時刻</Text>
            <HourPicker value={pickerStart} onChange={setPickerStart} />

            <Text style={styles.modalLabel}>終了時刻</Text>
            <HourPicker value={pickerEnd} onChange={setPickerEnd} />

            <View style={{ height: SPACING.md }} />
            <Button title="追加" onPress={addBlock} />
            <Button
              title="キャンセル"
              variant="ghost"
              onPress={() => setPickerOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function HourPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (h: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hourRow}
    >
      {HOURS.map((h) => {
        const selected = value === h;
        return (
          <Pressable
            key={h}
            onPress={() => onChange(h)}
            style={[styles.hourChip, selected && styles.hourChipOn]}
          >
            <Text
              style={[styles.hourText, selected && styles.hourTextOn]}
            >{`${String(h).padStart(2, '0')}:00`}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Timeline({ blocks }: { blocks: NotificationBlock[] }) {
  const cells: ('on' | 'off')[] = Array.from({ length: 24 }, () => 'on');
  for (const b of blocks) {
    if (b.start === b.end) {
      for (let i = 0; i < 24; i += 1) cells[i] = 'off';
      continue;
    }
    if (b.start < b.end) {
      for (let i = b.start; i < b.end; i += 1) cells[i] = 'off';
    } else {
      for (let i = b.start; i < 24; i += 1) cells[i] = 'off';
      for (let i = 0; i < b.end; i += 1) cells[i] = 'off';
    }
  }

  return (
    <View>
      <View style={styles.timeline}>
        {cells.map((c, i) => (
          <View
            key={i}
            style={[styles.tlCell, c === 'off' ? styles.tlOff : styles.tlOn]}
          />
        ))}
      </View>
      <View style={styles.tlLabels}>
        <Text style={styles.tlLabel}>0</Text>
        <Text style={styles.tlLabel}>6</Text>
        <Text style={styles.tlLabel}>12</Text>
        <Text style={styles.tlLabel}>18</Text>
        <Text style={styles.tlLabel}>24</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
        <Text style={styles.legendText}>通知あり</Text>
        <View style={{ width: SPACING.md }} />
        <View style={[styles.legendDot, { backgroundColor: COLORS.border }]} />
        <Text style={styles.legendText}>通知なし</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  blockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  blockText: { fontSize: FONT_SIZE.md, color: COLORS.text, fontWeight: '600' },
  removeBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  removeText: { color: COLORS.danger, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  modalLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  hourRow: { gap: SPACING.xs, paddingVertical: SPACING.xs },
  hourChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    marginRight: SPACING.xs,
  },
  hourChipOn: { backgroundColor: COLORS.primary },
  hourText: { color: COLORS.text, fontWeight: '600' },
  hourTextOn: { color: COLORS.onPrimary },
  timeline: {
    flexDirection: 'row',
    height: 28,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    gap: 1,
  },
  tlCell: { flex: 1, height: '100%' },
  tlOn: { backgroundColor: COLORS.primary },
  tlOff: { backgroundColor: COLORS.border },
  tlLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
  },
  tlLabel: { fontSize: FONT_SIZE.xs, color: COLORS.textMuted },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: SPACING.xs },
  legendText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs },
});
