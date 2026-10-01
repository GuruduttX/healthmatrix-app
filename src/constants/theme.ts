/**
 * HealthMatrix brand tokens, taken from the 2026 product brochure.
 * The app is light-only for now (`userInterfaceStyle: "light"` in app.json).
 */

export const Colors = {
  text: '#0E2A33',
  textSecondary: '#4D6368',
  textMuted: '#8A9A9E',

  background: '#F3F7F7',
  backgroundElement: '#FFFFFF',
  backgroundSelected: '#E1EBEC',
  border: '#D3DFE0',

  primary: '#DD4301',
  primaryMid: '#E67748',
  primaryLight: '#F6AF91',
  primarySoft: '#FEF1EA',

  ink: '#0E2A33',
  inkMid: '#244C56',
  onInk: '#FFFFFF',

  success: '#10806D',
  successSoft: '#DAF0EA',
  warning: '#B5780A',
  warningSoft: '#FBEFD2',
  danger: '#C23A00',
  dangerSoft: '#FCE3D6',
} as const;

export type ThemeColor = keyof typeof Colors;

/** Keys match the font names loaded in `src/app/_layout.tsx`. */
export const Fonts = {
  display: 'BricolageGrotesque_700Bold',
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const Shadows = {
  card: '0 1px 2px rgba(14, 42, 51, 0.04), 0 6px 20px rgba(14, 42, 51, 0.05)',
  floating: '0 10px 30px rgba(14, 42, 51, 0.14)',
  glow: '0 8px 20px rgba(221, 67, 1, 0.35)',
} as const;

/** Floating tab bar: pill height, gap below it, and how far the Ekaay button rises above it. */
export const TabBar = {
  height: 68,
  bottomGap: 12,
  centerLift: 22,
} as const;

export const MaxContentWidth = 800;
