/**
 * Central palette + tokens for reminds_me (white background + indigo accent).
 * Indigo reads both as a fill (white text on it) and as emphasis text on white.
 */
export const colors = {
  // メイン
  primary: '#183665', // ネイビー（アイコンと統一）
  primaryDark: '#0F2347', // 濃いネイビー（押下時）
  primaryLight: '#E8EDF5', // 薄いネイビー背景

  // 背景（インディゴ以外は白）
  background: '#FFFFFF',
  surface: '#FFFFFF', // カード
  surfaceAlt: '#F4F5FB', // 選択肢・チップなどの淡い面（ほぼ白）

  // テキスト
  textPrimary: '#1A1A2E',
  textSecondary: '#8A8AA0',
  textAccent: '#183665', // 白地のアクセント文字＝ネイビー
  /** Text/icon color on indigo primary surfaces. */
  onPrimary: '#FFFFFF',

  // フィードバック
  correct: '#22C55E',
  incorrect: '#EF4444',

  // プログレスバー
  progressBg: '#ECECF4',
  progressFill: '#183665',

  // ボーダー
  border: '#E8E8F0',
  white: '#FFFFFF',
  black: '#1A1A2E',
} as const;

/** Soft shadow for cards on a white background (indigo tint). */
export const cardShadow = {
  shadowColor: '#183665',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 3,
} as const;

/** Indigo gradient for hero surfaces. */
export const PRIMARY_GRADIENT: readonly [string, string] = ['#183665', '#0F2347'];

export const RADIUS_CARD = 14;
export const RADIUS_BUTTON = 14;
