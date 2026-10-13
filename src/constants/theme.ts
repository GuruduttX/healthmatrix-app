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
  inkDeep: '#08191F',
  inkMid: '#244C56',
  onInk: '#FFFFFF',
  /** Secondary text and hairlines on ink backgrounds. */
  onInkMuted: 'rgba(255, 255, 255, 0.7)',
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  /** Between ink and brand green; the middle of the consult card's gradient. */
  teal: '#155A57',
  /** Grey of a loading placeholder. */
  skeleton: '#E3ECED',

  success: '#10806D',
  successSoft: '#DAF0EA',
  warning: '#B5780A',
  warningSoft: '#FBEFD2',
  danger: '#C23A00',
  dangerSoft: '#FCE3D6',

  // The light redesign (Oct 2026): a warm page, white cards with hairlines, one orange accent.
  // Home uses these first; the other screens move over once Home is signed off.
  /** Warm ivory page colour. */
  canvas: '#F8F5F0',
  /** Wells inside a white card: chart backgrounds, quiet rows. */
  well: '#F6F1EA',
  /** Card borders and dividers on the warm page. */
  hairline: '#ECE5DC',
  /** Secondary and caption text on the warm page; warm greys, since orange sits badly on cool ones. */
  textSoft: '#5E5751',
  /** 4.6:1 on the page, 5:1 on white. */
  textFaint: '#766D66',
  /**
   * Brand orange is 4.3:1 on white: fine for icons, rings and big numbers, short of AA for text.
   * Buttons, links and small orange text use this (5.4:1, and white on it 5.4:1).
   */
  primaryDeep: '#C13A01',
  /** A touch lighter, for a big filled button that shouldn't feel heavy; white on it is 4.8:1. */
  primaryBright: '#D03F01',
  /** Pressed buttons, and orange text on a peach tint (7:1). */
  primaryInk: '#A23101',
  /** Peach fill behind orange icons and soft buttons. */
  primaryTint: '#FDF1EA',
  primaryTintStrong: '#FBE2D4',
  /**
   * Reading flags, picked to stay apart for red-green colour blindness: "in range" is a blue
   * teal, "high" a crimson, and neither is the brand orange. A flag always comes with its word.
   */
  good: '#0B6E99',
  goodSoft: '#E8F2F7',
  watch: '#8F6200',
  watchSoft: '#FDF3D8',
  high: '#A3123A',
  highSoft: '#FBEAEE',
} as const;

export type ThemeColor = keyof typeof Colors;

/** Gradient stops shared across screens, so every dark header and brand badge matches Home. */
export const Gradients = {
  /** Dark headers: Home's hero, each tab's header, the emergency card. */
  hero: [Colors.inkDeep, Colors.ink, Colors.inkMid],
  /** Orange badges and icons: Ekaay's sparkle, avatars without a photo. */
  brand: [Colors.primaryMid, Colors.primary],
  /** Live and time-sensitive cards: the next consult. */
  teal: [Colors.ink, Colors.teal, Colors.success],
} as const;

/** Keys match the font names loaded in `src/app/_layout.tsx`. */
export const Fonts = {
  display: 'BricolageGrotesque_700Bold',
  /** Big numbers and headings on the light redesign: calmer than the bold cut. */
  displaySemibold: 'BricolageGrotesque_600SemiBold',
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
  /** Hero cards on the light redesign. */
  xxl: 28,
  pill: 999,
} as const;

export const Shadows = {
  card: '0 1px 2px rgba(14, 42, 51, 0.04), 0 6px 20px rgba(14, 42, 51, 0.05)',
  floating: '0 10px 30px rgba(14, 42, 51, 0.14)',
  glow: '0 8px 20px rgba(221, 67, 1, 0.35)',
  /** Cards that sit over the dark Home hero. */
  lifted: '0 2px 6px rgba(14, 42, 51, 0.06), 0 18px 40px rgba(14, 42, 51, 0.12)',
  /** White cards on the warm page, with a hairline border: barely lifted, tinted warm. */
  soft: '0 1px 2px rgba(58, 36, 22, 0.04), 0 4px 14px rgba(58, 36, 22, 0.05)',
  /** The one raised card per screen, and floating controls. */
  raised: '0 2px 6px rgba(58, 36, 22, 0.05), 0 14px 34px rgba(58, 36, 22, 0.09)',
} as const;

/**
 * Floating tab bar: dock height, gap below it, and how far anything rises above it. Ekaay's orb
 * sits inside the dock now, so nothing does.
 */
export const TabBar = {
  height: 70,
  bottomGap: 12,
  centerLift: 0,
} as const;

export const MaxContentWidth = 800;
