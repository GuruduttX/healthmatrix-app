import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { useId, useState, type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
  LinearGradient as SvgLinearGradient,
} from 'react-native-svg';

import { Glass as Tokens, Radius } from '@/constants/theme';

/**
 * iOS 26's Liquid Glass, for controls that float over content (the tab dock). Elsewhere those
 * controls are frosted panes like the cards.
 */
export const liquidGlass =
  Platform.OS === 'ios' && isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

/** Blurs what's behind a pane on web; native panes sit on soft light, which needs no blur. */
export const webBlur =
  Platform.OS === 'web'
    ? ({ backdropFilter: Tokens.blur } as unknown as ViewStyle)
    : undefined;

/**
 * Glass as plain styles, for a control that is itself the pressable or has no room for a `Glass`
 * wrapper: round buttons, pills, small dishes, fields. Cards use `<Glass>`, which adds the rim,
 * the gloss and the light within.
 */
export const glassSurface = StyleSheet.create({
  /** Rounds, pills and secondary buttons on the page or a pane. */
  small: {
    borderWidth: 1,
    borderColor: Tokens.rim,
    backgroundColor: Tokens.fillSoft,
    boxShadow: `${Tokens.glowSmall}, ${Tokens.shadowSmall}`,
    ...webBlur,
  },
  /** Glass set into a pane: a dish, a panel, a well. */
  flat: {
    borderWidth: 1,
    borderColor: Tokens.rim,
    backgroundColor: Tokens.fillFlat,
    boxShadow: `${Tokens.glowSmall}, ${Tokens.shadowFlat}`,
  },
  /** A pane without the `Glass` extras, where a View must be the card itself. */
  card: {
    borderWidth: 1,
    borderColor: Tokens.rim,
    backgroundColor: Tokens.fill,
    boxShadow: `${Tokens.glow}, ${Tokens.shadow}`,
    ...webBlur,
  },
});

/** A rounded rectangle as a path, so it can be drawn, or cut out of a clip. */
export function roundRectPath(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

/**
 * Round glows of light, as shares of the screen: where each sits, how far it reaches (a share of
 * the width), its colour and how strong it is at the centre. Separate discs floating inside the
 * page, peach and sky blue in turn as they zig-zag down it, with white between them and at the
 * edges, as in the brand's reference.
 */
const GLOWS = [
  { x: 0.7, y: 0.16, r: 0.44, color: Tokens.apricot, peak: 0.48 },
  { x: 0.28, y: 0.45, r: 0.48, color: Tokens.sky, peak: 0.78 },
  { x: 0.74, y: 0.73, r: 0.42, color: Tokens.apricot, peak: 0.42 },
  { x: 0.24, y: 0.99, r: 0.42, color: Tokens.sky, peak: 0.62 },
] as const;

/**
 * The page behind the glass: warm white, with a few round glows of soft peach and sky blue, the
 * brand's orange and blue. Fixed to the screen, so panes slide over the glows as the page scrolls
 * and take their tint. Each glow is strongest at its centre and fades out slowly before its edge,
 * so it reads as a disc of light with no edge.
 */
export function Aurora({ style }: { style?: StyleProp<ViewStyle> }) {
  const { width, height } = useWindowDimensions();
  // Every screen draws its own; on web a hidden screen underneath would otherwise own the ids.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <View style={[StyleSheet.absoluteFill, styles.page, style]}>
      <Svg width={width} height={height}>
        <Defs>
          {GLOWS.map((glow, i) => (
            <RadialGradient
              key={i}
              id={`${id}aurora${i}`}
              cx={glow.x * width}
              cy={glow.y * height}
              r={glow.r * width}
              gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={glow.color} stopOpacity={glow.peak} />
              <Stop offset="0.45" stopColor={glow.color} stopOpacity={glow.peak * 0.62} />
              <Stop offset="0.8" stopColor={glow.color} stopOpacity={glow.peak * 0.16} />
              <Stop offset="1" stopColor={glow.color} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {GLOWS.map((glow, i) => (
          <Circle
            key={i}
            cx={glow.x * width}
            cy={glow.y * height}
            r={glow.r * width}
            fill={`url(#${id}aurora${i})`}
          />
        ))}
      </Svg>
    </View>
  );
}

/**
 * A glass sphere floating behind a pane: crisp where it shows past the pane's edge, softened and
 * frosted where the pane covers it. That's what makes glass read as glass.
 */
export type Orb = {
  /** The centre, as shares of the pane: 0 is its left or top edge, 1 its right or bottom. */
  x: number;
  y: number;
  /** Radius in points. */
  r: number;
  tone: 'peach' | 'sky';
};

/** Each sphere lit from the top left; `haze` is how it looks through the frost. */
const SPHERES = {
  peach: { light: '#FFF7F1', body: '#FFD9C1', edge: '#F6B188', haze: '#FFD7BF' },
  sky: { light: '#F3FAFF', body: '#BFDDF4', edge: '#86B8E0', haze: '#C2DEF3' },
} as const;

/** How far a sphere may reach past its pane. */
const ORB_ROOM = 72;
/** How soft a sphere looks through the frost. */
const FROST = 16;

type Box = { width: number; height: number };

/** The spheres' crisp parts, outside the pane only: the pane's own shape is cut out of the clip. */
function OrbsBehind({ box, radius, orbs }: { box: Box; radius: number; orbs: Orb[] }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const width = box.width + ORB_ROOM * 2;
  const height = box.height + ORB_ROOM * 2;

  return (
    <Svg width={width} height={height} style={styles.orbsBehind} pointerEvents="none">
      <Defs>
        <ClipPath id={`${id}out`}>
          <Path
            d={`M0 0 H${width} V${height} H0 Z ${roundRectPath(ORB_ROOM, ORB_ROOM, box.width, box.height, radius)}`}
            clipRule="evenodd"
          />
        </ClipPath>
        {orbs.map((orb, i) => {
          const tone = SPHERES[orb.tone];
          return (
            <RadialGradient key={i} id={`${id}s${i}`} cx="50%" cy="50%" r="50%" fx="34%" fy="28%">
              <Stop offset="0" stopColor={tone.light} />
              <Stop offset="0.55" stopColor={tone.body} />
              <Stop offset="1" stopColor={tone.edge} />
            </RadialGradient>
          );
        })}
      </Defs>
      <G clipPath={`url(#${id}out)`}>
        {orbs.map((orb, i) => (
          <Circle
            key={i}
            cx={ORB_ROOM + orb.x * box.width}
            cy={ORB_ROOM + orb.y * box.height}
            r={orb.r}
            fill={`url(#${id}s${i})`}
          />
        ))}
      </G>
    </Svg>
  );
}

/**
 * Light inside the pane: the spheres behind it, softened by the frost, and (on cards) a faint
 * peach in the top-right corner and sky blue in the bottom left, as if the glass were tinted.
 */
function LightWithin({ box, orbs, tinted }: { box: Box; orbs: Orb[]; tinted: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reach = Math.max(box.width, box.height) * 0.7;
  const tints = tinted
    ? [
        { cx: box.width, cy: 0, color: Tokens.apricot, peak: 0.56 },
        { cx: 0, cy: box.height, color: Tokens.sky, peak: 0.75 },
      ]
    : [];

  return (
    <Svg width={box.width} height={box.height} style={styles.within} pointerEvents="none">
      <Defs>
        {tints.map((tint, i) => (
          <RadialGradient
            key={i}
            id={`${id}t${i}`}
            cx={tint.cx}
            cy={tint.cy}
            r={reach}
            gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={tint.color} stopOpacity={tint.peak} />
            <Stop offset="0.5" stopColor={tint.color} stopOpacity={tint.peak * 0.37} />
            <Stop offset="1" stopColor={tint.color} stopOpacity={0} />
          </RadialGradient>
        ))}
        {orbs.map((orb, i) => {
          const cx = orb.x * box.width;
          const cy = orb.y * box.height;
          const r = orb.r + FROST;
          return (
            <RadialGradient
              key={i}
              id={`${id}o${i}`}
              cx={cx}
              cy={cy}
              r={r}
              gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={SPHERES[orb.tone].haze} stopOpacity={0.9} />
              <Stop
                offset={Math.max((orb.r - FROST) / r, 0)}
                stopColor={SPHERES[orb.tone].haze}
                stopOpacity={0.8}
              />
              <Stop offset="1" stopColor={SPHERES[orb.tone].haze} stopOpacity={0} />
            </RadialGradient>
          );
        })}
      </Defs>
      {tints.map((tint, i) => (
        <Circle key={i} cx={tint.cx} cy={tint.cy} r={reach} fill={`url(#${id}t${i})`} />
      ))}
      {orbs.map((orb, i) => (
        <Circle
          key={i}
          cx={orb.x * box.width}
          cy={orb.y * box.height}
          r={orb.r + FROST}
          fill={`url(#${id}o${i})`}
        />
      ))}
    </Svg>
  );
}

/**
 * The pane's rim: bright where the light strikes the top-left edge, fading along the sides, and
 * catching it again at the bottom right, as on the edge of real glass.
 */
function Rim({ box, radius }: { box: Box; radius: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={box.width} height={box.height} style={styles.within} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
          <Stop offset="0.4" stopColor="#FFFFFF" stopOpacity={0.5} />
          <Stop offset="0.72" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.9} />
        </SvgLinearGradient>
      </Defs>
      <Rect
        x={0.75}
        y={0.75}
        width={Math.max(box.width - 1.5, 0)}
        height={Math.max(box.height - 1.5, 0)}
        rx={Math.max(radius - 0.75, 0)}
        stroke={`url(#${id})`}
        strokeWidth={1.5}
        fill="none"
      />
    </Svg>
  );
}

type Variant = 'card' | 'small' | 'flat';

type GlassProps = Omit<ViewProps, 'style' | 'children'> & {
  /**
   * The pane: padding and layout of what's inside. Margins, size, flex and position move to the
   * outer box on their own, so the lift and rim wrap the card itself.
   */
  style?: StyleProp<ViewStyle>;
  /** The outer box that carries the lift: margins, flex, position. */
  wrapperStyle?: StyleProp<ViewStyle>;
  radius?: number;
  /**
   * `card` for a pane on the page; `small` for rounds and pills, a little more frost and a closer
   * lift; `flat` for glass set into glass, with only the edge line.
   */
  variant?: Variant;
  /** Glass spheres floating behind the pane, peeking past its edges. */
  orbs?: Orb[];
  /** Faint peach and blue light inside the pane; on by default for cards. */
  tinted?: boolean;
  children?: ReactNode;
};

const LOOKS: Record<Variant, { fill: string; glow: string; shadow: string }> = {
  card: { fill: Tokens.fill, glow: Tokens.glow, shadow: Tokens.shadow },
  small: { fill: Tokens.fillSoft, glow: Tokens.glowSmall, shadow: Tokens.shadowSmall },
  flat: { fill: Tokens.fillFlat, glow: Tokens.glowSmall, shadow: Tokens.shadowFlat },
};

const NO_ORBS: Orb[] = [];

/**
 * Keys that place and size a card among its neighbours; on the pane they'd sit inside the lift and
 * rim. The pane fills the outer box.
 */
const OUTER_KEYS = new Set([
  'margin',
  'marginTop',
  'marginBottom',
  'marginLeft',
  'marginRight',
  'marginHorizontal',
  'marginVertical',
  'marginStart',
  'marginEnd',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'alignSelf',
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'aspectRatio',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'zIndex',
]);

/** Splits a pane style into what places the card (outer box) and what shapes the pane. */
function splitStyle(style: StyleProp<ViewStyle>) {
  const outer: Record<string, unknown> = {};
  const pane: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(StyleSheet.flatten(style) ?? {})) {
    (OUTER_KEYS.has(key) ? outer : pane)[key] = value;
  }
  return { outer: outer as ViewStyle, pane: pane as ViewStyle };
}

/**
 * A pane of glass: a clear body that takes the tint of the light behind it, light within it
 * (spheres behind it softened by the frost, a faint peach and blue), frost thickening toward the
 * edges, gloss across the top-left corner, and a rim catching the light. The lift sits on an outer
 * box; the pane rounds and clips its layers. Light and gloss sit under the content and the rim
 * over it, so on web the content paints between them.
 */
export function Glass({
  style,
  wrapperStyle,
  radius = Radius.xl,
  variant = 'card',
  orbs = NO_ORBS,
  tinted = variant === 'card',
  children,
  onLayout,
  ...paneProps
}: GlassProps) {
  const look = LOOKS[variant];
  const [box, setBox] = useState<Box | null>(null);
  const { outer, pane } = splitStyle(style);

  return (
    <View style={[{ borderRadius: radius, boxShadow: look.shadow }, outer, wrapperStyle]}>
      {box && orbs.length ? <OrbsBehind box={box} radius={radius} orbs={orbs} /> : null}
      <View
        style={[
          styles.pane,
          webBlur,
          { borderRadius: radius, backgroundColor: look.fill, boxShadow: look.glow },
          pane,
        ]}
        {...paneProps}
        onLayout={(event) => {
          const { layout } = event.nativeEvent;
          setBox((current) =>
            current && current.width === layout.width && current.height === layout.height
              ? current
              : { width: layout.width, height: layout.height },
          );
          onLayout?.(event);
        }}>
        {box && (tinted || orbs.length) ? (
          <LightWithin box={box} orbs={orbs} tinted={tinted} />
        ) : null}
        <LinearGradient
          colors={Tokens.sheen}
          locations={[0, 0.55]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.noTouch]}
        />
        {children}
        {box ? <Rim box={box} radius={radius} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    pointerEvents: 'none',
    backgroundColor: Tokens.page,
  },
  pane: {
    flexGrow: 1,
    overflow: 'hidden',
  },
  within: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  orbsBehind: {
    position: 'absolute',
    top: -ORB_ROOM,
    left: -ORB_ROOM,
  },
  noTouch: {
    pointerEvents: 'none',
  },
});
