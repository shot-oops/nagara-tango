import { colors } from '../theme/colors';

export const COLORS = {
  primary: colors.primary, // yellow
  primaryDark: colors.primaryDark,
  /** Text/icon color on yellow primary surfaces. */
  onPrimary: colors.onPrimary,
  secondary: colors.primary, // 習得済み等の強調も黄色
  accent: colors.primary,
  background: colors.background, // dark
  card: colors.surface, // #242424
  surface: colors.surfaceAlt, // #2E2E2E
  text: colors.textPrimary, // white
  textMuted: colors.textSecondary, // grey
  border: colors.border,
  danger: colors.incorrect,
  warning: colors.primary,
  success: colors.correct, // green
  white: colors.white,
  black: colors.black,
} as const;

export { cardShadow as SHADOW } from '../theme/colors';

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 14,
  button: 14,
  card: 14,
  xl: 20,
  pill: 999,
} as const;
