/**
 * HealthMatrix brand tokens, taken from the 2026 product brochure.
 * The app is light-only for now (`userInterfaceStyle: "light"` in app.json).
 */

export const Colors = {
  text: '#0E2A33',
  // The names below came with the first, cool grey-teal look. Since the whole app moved to Home's
  // warm light design (Oct 2026) they hold the warm values, so older code reads right; new code
  // uses the light names further down (`textSoft`, `hairline`, `good`, `high`, ...).
  /** Same as `textSoft`. */
  textSecondary: '#5E5751',
  /** Placeholders, chevrons and disabled icons; text that must be read uses `textFaint`. */
  textMuted: '#8C837C',

  /** Same as `canvas`. */
  background: '#F8F5F0',
  backgroundElement: '#FFFFFF',
  /** A warm grey for tracks (segmented controls) and pressed rows. */
  backgroundSelected: '#F2ECE4',
  /** Field outlines: a step stronger than `hairline`, so an empty input still shows its edge. */
  border: '#E3D9CE',

  primary: '#DD4301',
  primaryMid: '#E67748',
  primaryLight: '#F6AF91',
  /** Same as `primaryTint`. */
  primarySoft: '#FDF1EA',

  ink: '#0E2A33',
  inkDeep: '#08191F',
  inkMid: '#244C56',
  onInk: '#FFFFFF',
  /** Secondary text and hairlines on ink backgrounds: the video call. */
  onInkMuted: 'rgba(255, 255, 255, 0.7)',
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.14)',
  /** Between ink and brand green; the video call's backdrop. */
  teal: '#155A57',
  /** Grey of a loading placeholder, warm like the page. */
  skeleton: '#EEE7DE',

  /** Same as `good`: done, on, signed. */
  success: '#0B6E99',
  successSoft: '#E8F2F7',
  /** Same as `watch`. */
  warning: '#8F6200',
  warningSoft: '#FDF3D8',
  /** Same as `high`: errors and removing things. Never orange, which is the brand. */
  danger: '#A3123A',
  dangerSoft: '#FBEAEE',

  // The light design (Oct 2026), on every screen: a warm page, white cards with hairlines, one
  // orange accent.
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

/** Gradient stops shared across screens. */
export const Gradients = {
  /** Orange badges and icons: Ekaay's mark, avatars without a photo, the health card. */
  brand: [Colors.primaryMid, Colors.primary],
  /** The warm light at the top of every page, fading into `canvas`. */
  morning: ['#F9EBE1', 'rgba(250, 239, 231, 0.7)', 'rgba(248, 245, 240, 0)'],
  /** One tint for every round dish behind 3D art or an icon: white warming to apricot. */
  dish: ['#FFFFFF', '#FBE3D4'],
  /** A quieter dish for small leads in a list. */
  dishQuiet: ['#FFF9F5', '#F6E9DF'],
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
  /** Same as `soft`. */
  card: '0 1px 2px rgba(58, 36, 22, 0.04), 0 4px 14px rgba(58, 36, 22, 0.05)',
  floating: '0 10px 30px rgba(58, 36, 22, 0.14)',
  /**
   * Under a filled orange button: close and warm, never an orange glow (the brand sits near
   * Swiggy's hue, and a glow makes it shout).
   */
  button: '0 1px 2px rgba(110, 30, 0, 0.12), 0 6px 14px rgba(110, 30, 0, 0.14)',
  /** Same as `raised`. */
  lifted: '0 2px 6px rgba(58, 36, 22, 0.05), 0 14px 34px rgba(58, 36, 22, 0.09)',
  /** Round dishes behind 3D art: close and soft, then wide and faint. */
  dish: '0 1px 2px rgba(58, 36, 22, 0.06), 0 8px 18px rgba(58, 36, 22, 0.09)',
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

/** Side margins on every page; rows that scroll sideways bleed by this much to reach the edges. */
export const Gutter = Spacing.four - 4;
