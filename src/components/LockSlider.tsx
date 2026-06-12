import React, { useRef } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { COLORS, SHADOW } from '../constants/colors';

interface Props {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
  /** Draggable lower bound (values below are locked/grey). Default = min. */
  allowedMin?: number;
  /** Draggable upper bound (values above are locked/grey). Default = max. */
  allowedMax?: number;
}

/**
 * Custom slider with a lockable range. The portion of the track outside
 * [allowedMin, allowedMax] is greyed out and the thumb cannot be dragged into
 * it — used to gate paid ranges behind a premium subscription.
 *
 * Uses absolute window coordinates (measureInWindow + gesture.moveX) for
 * accurate tracking, and refuses to yield the gesture to a parent ScrollView so
 * the drag never gets interrupted mid-interaction.
 */
export function LockSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  allowedMin = min,
  allowedMax = max,
}: Props) {
  const wrapRef = useRef<View>(null);
  const geo = useRef({ left: 0, width: 0 });
  const cfg = useRef({ min, max, step, onChange, allowedMin, allowedMax });
  cfg.current = { min, max, step, onChange, allowedMin, allowedMax };

  const measure = () => {
    wrapRef.current?.measureInWindow((x, _y, w) => {
      if (w > 0) geo.current = { left: x, width: w };
    });
  };

  const setFromPageX = (pageX: number) => {
    const c = cfg.current;
    const { left, width } = geo.current;
    if (width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (pageX - left) / width));
    const raw = c.min + ratio * (c.max - c.min);
    const stepped = Math.round((raw - c.min) / c.step) * c.step + c.min;
    const clamped = Math.max(c.allowedMin, Math.min(c.allowedMax, stepped));
    c.onChange(clamped);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      // Never hand the gesture back to a parent ScrollView mid-drag.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (_e, g) => {
        measure();
        setFromPageX(g.x0);
      },
      onPanResponderMove: (_e, g) => setFromPageX(g.moveX),
    })
  ).current;

  const pct = (v: number) =>
    max === min ? 0 : ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * 100;

  const valuePct = pct(Math.max(allowedMin, Math.min(allowedMax, value)));
  const aMinPct = pct(allowedMin);
  const aMaxPct = pct(allowedMax);

  return (
    <View
      ref={wrapRef}
      style={styles.wrap}
      onLayout={measure}
      {...pan.panHandlers}
    >
      <View style={styles.track}>
        {allowedMin > min && (
          <View style={[styles.locked, { left: 0, width: `${aMinPct}%` }]} />
        )}
        {allowedMax < max && (
          <View style={[styles.locked, { left: `${aMaxPct}%`, right: 0 }]} />
        )}
        <View
          style={[
            styles.fill,
            { left: `${aMinPct}%`, width: `${Math.max(0, valuePct - aMinPct)}%` },
          ]}
        />
      </View>
      <View style={[styles.thumb, { left: `${valuePct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 48, justifyContent: 'center' },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 21,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  locked: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#D7D7E0',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: '#ffffff',
    ...SHADOW,
  },
});
