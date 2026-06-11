import React, { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import {
  BellKun,
  BrainKun,
  PhoneKun,
  RocketKun,
} from '../../components/characters';
import { COLORS, FONT_SIZE, SPACING } from '../../constants/colors';

interface Slide {
  Icon: React.ComponentType<{ size?: number }>;
  heading: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    Icon: BellKun,
    heading: '通知を見るだけ',
    body: 'アプリを開かなくても通知バナーで単語が目に入ります',
  },
  {
    Icon: BrainKun,
    heading: '忘れた頃に届く',
    body: '忘却曲線に基づき\n最適なタイミングで復習ができます',
  },
  {
    Icon: PhoneKun,
    heading: 'ワンタップで記録',
    body: '英単語のみの通知はテストモード\nタップまたは長押しで回答できます',
  },
  {
    Icon: RocketKun,
    heading: '始めましょう',
    body: 'まずは通知設定から',
  },
];

const { width } = Dimensions.get('window');

export function OnboardingSlides({ onDone }: { onDone: () => void }) {
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const p = Math.round(e.nativeEvent.contentOffset.x / width);
    if (p !== page) setPage(p);
  };

  const isLast = page === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      onDone();
      return;
    }
    scrollRef.current?.scrollTo({ x: width * (page + 1), animated: true });
  };

  return (
    <LinearGradient colors={['#FFFFFF', '#E8EDF5']} style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
        >
          {SLIDES.map((s, i) => {
            const Icon = s.Icon;
            return (
              <View key={i} style={[styles.slide, { width }]}>
                <View style={styles.iconWrap}>
                  <Icon size={150} />
                </View>
                <Text style={styles.heading}>{s.heading}</Text>
                <Text style={styles.body}>{s.body}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === page ? styles.dotOn : styles.dotOff]}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Button title={isLast ? '始める' : '次へ'} onPress={next} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  iconWrap: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  heading: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  body: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotOn: { backgroundColor: COLORS.primary, width: 22 },
  dotOff: { backgroundColor: COLORS.border },
  footer: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
});
