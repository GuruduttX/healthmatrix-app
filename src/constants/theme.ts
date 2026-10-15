/**
 * HealthMatrix brand tokens, taken from the 2026 product brochure.
 * The app is light-only for now (`userInterfaceStyle: "light"` in app.json).
 */

export const Colors = {
  text: '#0E2A33',
  // The names below came with the first, cool grey-teal look, then held the warm light design's
  // values. Since the whole app moved to Home's glass design (Oct 2026), the fills, lines and tints
  // are see-through, so they take the tint of the glass and light behind them; new code uses the
  // light names further down (`textSoft`, `hairline`, `good`, `high`, ...).
  /** Same as `textSoft`. */
  textSecondary: '#5E5751',
  /** Placeholders, chevrons and disabled icons; text that must be read uses `textFaint`. */
  textMuted: '#8C837C',

  /** Same as `canvas`. */
  background: '#FBFAF8',
  /** Solid white: what must stay opaque (a QR's ground, a ring around a badge). Cards are `Glass`. */
  backgroundElement: '#FFFFFF',
  /** A see-through grey for tracks and pressed rows. */
  backgroundSelected: 'rgba(40, 64, 84, 0.07)',
  /** Field outlines: a step stronger than `hairline`, so an empty input still shows its edge. */
  border: 'rgba(40, 64, 84, 0.16)',

  primary: '#DD4301',
  primaryMid: '#E67748',
  primaryLight: '#F6AF91',
  /** Same as `primaryTint`. */
  primarySoft: 'rgba(221, 67, 1, 0.08)',

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
  /** Grey of a loading placeholder, see-through so it sits on glass. */
  skeleton: 'rgba(40, 64, 84, 0.08)',

  /** Same as `good`: done, on, signed. */
  success: '#0B6E99',
  successSoft: 'rgba(11, 110, 153, 0.1)',
  /** Same as `watch`. */
  warning: '#8F6200',
  warningSoft: 'rgba(143, 98, 0, 0.1)',
  /** Same as `high`: errors and removing things. Never orange, which is the brand. */
  danger: '#A3123A',
  dangerSoft: 'rgba(163, 18, 58, 0.08)',

  // The glass design (Oct 2026), on every screen: a warm white page with soft light, panes of glass
  // (`Glass` in `ui/glass.tsx`), one orange accent.
  /** Warm white page colour, under the light (same as `Glass.page`). */
  canvas: '#FBFAF8',
  /** Wells inside a pane: chart backgrounds, quiet rows. See-through. */
  well: 'rgba(40, 64, 84, 0.05)',
  /** Borders and dividers: see-through, so they take the glass's tint. */
  hairline: 'rgba(40, 64, 84, 0.1)',
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
  /** Peach fill behind orange icons and soft buttons: see-through, so it sits on glass. */
  primaryTint: 'rgba(221, 67, 1, 0.08)',
  primaryTintStrong: 'rgba(221, 67, 1, 0.14)',
  /**
   * Reading flags, picked to stay apart for red-green colour blindness: "in range" is a blue
   * teal, "high" a crimson, and neither is the brand orange. A flag always comes with its word.
   */
  good: '#0B6E99',
  goodSoft: 'rgba(11, 110, 153, 0.1)',
  watch: '#8F6200',
  watchSoft: 'rgba(143, 98, 0, 0.1)',
  high: '#A3123A',
  highSoft: 'rgba(163, 18, 58, 0.08)',
} as const;

export type ThemeColor = keyof typeof Colors;

/** Gradient stops shared across screens. */
export const Gradients = {
  /** Orange badges and icons: Ekaay's mark, avatars without a photo, the health card. */
  brand: [Colors.primaryMid, Colors.primary],
  /** One tint for every round dish behind 3D art or an icon: clear white glass warming to peach. */
  dish: ['rgba(255, 255, 255, 0.92)', 'rgba(255, 222, 200, 0.6)'],
  /** A quieter dish for small leads in a list: clear white glass cooling to sky. */
  dishQuiet: ['rgba(255, 255, 255, 0.88)', 'rgba(222, 236, 247, 0.6)'],
} as const;

/**
 * The glass design (Oct 2026, Home first): a warm white page with round glows of the brand's two
 * colours, sky blue and peach (`Aurora` in `ui/glass.tsx`), fixed behind the scrolling page, and
 * panes of glass over it. A pane's body is nearly clear, so the glows show through it and shift as
 * the page scrolls; its frost thickens toward the edges,
 * a rim catches the light at the top left, and a faint cool line and a light lift set it apart.
 */
export const Glass = {
  /** Warm white, the majority of the page. */
  page: '#FBFAF8',
  /** A pane's body: nearly clear, so the glows behind it show through as the page scrolls. */
  fill: 'rgba(255, 255, 255, 0.16)',
  /** Small glass on a pane or the page: dishes, round buttons, secondary pills. */
  fillSoft: 'rgba(255, 255, 255, 0.4)',
  /** Glass set into glass: the chart panel, dishes on a card. */
  fillFlat: 'rgba(255, 255, 255, 0.2)',
  /** Gloss across the top-left corner, where the light falls. */
  sheen: ['rgba(255, 255, 255, 0.42)', 'rgba(255, 255, 255, 0)'],
  rim: 'rgba(255, 255, 255, 0.95)',
  /** Light on the top edge, and frost thickening toward the edges, as in a slab of glass. */
  glow: 'inset 0 1px 1px rgba(255, 255, 255, 0.95), inset 0 0 14px rgba(255, 255, 255, 0.6)',
  glowSmall: 'inset 0 1px 1px rgba(255, 255, 255, 0.95), inset 0 0 8px rgba(255, 255, 255, 0.65)',
  /** Same as the first part of `glow`: the top edge alone. */
  shine: 'inset 0 1px 1px rgba(255, 255, 255, 0.95)',
  /** The edge line, then a close and a wide lift: light, and cool so it sits on blue and peach. */
  shadow:
    '0 0 0 1px rgba(44, 72, 96, 0.07), 0 1px 3px rgba(30, 50, 70, 0.04), 0 10px 30px rgba(30, 50, 70, 0.07)',
  /** For small glass: rounds, pills. */
  shadowSmall:
    '0 0 0 1px rgba(44, 72, 96, 0.07), 0 1px 2px rgba(30, 50, 70, 0.05), 0 5px 14px rgba(30, 50, 70, 0.08)',
  /** Glass inside glass: only the edge line. */
  shadowFlat: '0 0 0 1px rgba(44, 72, 96, 0.07)',
  /** Dividers on a pane: see-through, so they take the pane's tint. */
  hairline: 'rgba(40, 64, 84, 0.09)',
  /** Flag pills on glass: the flag colours, see-through, so the pill takes the pane's tint too. */
  goodTint: 'rgba(11, 110, 153, 0.1)',
  watchTint: 'rgba(143, 98, 0, 0.1)',
  highTint: 'rgba(163, 18, 58, 0.08)',
  /** Web only: what's behind a pane is blurred (native panes sit on soft light, which needs no blur). */
  blur: 'blur(26px) saturate(180%)',
  /** Web only: the dock floats over text, so it blurs harder. */
  blurDock: 'blur(36px) saturate(180%)',
  /** The light: a sky blue from the brand's ink and a peach from its orange, both soft. */
  sky: '#D9E9F4',
  apricot: '#F6E0CC',
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
