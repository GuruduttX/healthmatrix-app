import { useId, type ReactNode } from 'react';
import Svg, {
  ClipPath,
  Defs,
  FeGaussianBlur,
  Filter,
  G,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgGradient,
} from 'react-native-svg';

/** Strokes and marks drawn on the glass: the brand orange, a step deeper so thin lines hold. */
const MARK = '#E2520E';

/** A rounded rectangle as a path, so it can be both drawn and used to clip. */
function roundRect(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y} H${x + w - r} A${r} ${r} 0 0 1 ${x + w} ${y + r} V${y + h - r} A${r} ${r} 0 0 1 ${x + w - r} ${y + h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`;
}

/** A plus with rounded ends: `a` is half its span, `t` half an arm's thickness. */
function plus(cx: number, cy: number, a: number, t: number, r: number) {
  return [
    `M${cx - t + r} ${cy - a} H${cx + t - r} Q${cx + t} ${cy - a} ${cx + t} ${cy - a + r} V${cy - t}`,
    `H${cx + a - r} Q${cx + a} ${cy - t} ${cx + a} ${cy - t + r} V${cy + t - r} Q${cx + a} ${cy + t} ${cx + a - r} ${cy + t}`,
    `H${cx + t} V${cy + a - r} Q${cx + t} ${cy + a} ${cx + t - r} ${cy + a} H${cx - t + r} Q${cx - t} ${cy + a} ${cx - t} ${cy + a - r}`,
    `V${cy + t} H${cx - a + r} Q${cx - a} ${cy + t} ${cx - a} ${cy + t - r} V${cy - t + r} Q${cx - a} ${cy - t} ${cx - a + r} ${cy - t}`,
    `H${cx - t} V${cy - a + r} Q${cx - t} ${cy - a} ${cx - t + r} ${cy - a} Z`,
  ].join(' ');
}

type GlyphProps = {
  size: number;
  /** The solid shape at the back, in the orange gradient. */
  back: string;
  /** Marks on the back shape, hidden where the glass covers it. */
  backMarks?: ReactNode;
  /** The pane of frosted glass in front. */
  glass: string;
  /** Marks on the glass. */
  marks?: (orange: string) => ReactNode;
};

/**
 * A glass icon on a 32-point grid: an orange shape at the back and a pane of frosted glass in
 * front of it. Where the pane covers the shape, the shape shows through blurred and whitened, as
 * through real frosted glass; the pane's rim catches the light.
 */
function GlassGlyph({ size, back, backMarks, glass, marks }: GlyphProps) {
  // Ids are shared across the page on web: each icon gets its own.
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const orange = `url(#${id}o)`;

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <SvgGradient id={`${id}o`} x1="0.1" y1="0" x2="0.9" y2="1">
          <Stop offset="0" stopColor="#FFB27D" />
          <Stop offset="0.5" stopColor="#F47634" />
          <Stop offset="1" stopColor="#DD4301" />
        </SvgGradient>
        <SvgGradient id={`${id}f`} x1="0" y1="0" x2="0.75" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#FFCDB0" stopOpacity={0.72} />
        </SvgGradient>
        <SvgGradient id={`${id}t`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F47634" stopOpacity={0.32} />
          <Stop offset="1" stopColor="#DD4301" stopOpacity={0.22} />
        </SvgGradient>
        <ClipPath id={`${id}c`}>
          <Path d={glass} />
        </ClipPath>
        <Filter id={`${id}b`} x="-40%" y="-40%" width="180%" height="180%">
          <FeGaussianBlur stdDeviation={1.5} />
        </Filter>
        <Filter id={`${id}s`} x="-40%" y="-40%" width="180%" height="180%">
          <FeGaussianBlur stdDeviation={1.1} />
        </Filter>
      </Defs>

      <Path d={back} fill={orange} fillRule="evenodd" />
      {backMarks}
      {/* The pane's soft shadow, warm, a little below it; the pane covers it but at the edges. */}
      <Path
        d={glass}
        fill="#C84A10"
        fillOpacity={0.28}
        filter={`url(#${id}s)`}
        transform="translate(0 1.1)"
      />
      {/* Through the pane: a white ground, then the back shape blurred. */}
      <G clipPath={`url(#${id}c)`}>
        <Rect width={32} height={32} fill="#FFFFFF" />
        <Path d={back} fill={orange} fillRule="evenodd" filter={`url(#${id}b)`} />
      </G>
      <Path d={glass} fill={`url(#${id}f)`} stroke="#FFFFFF" strokeWidth={0.8} />
      {marks?.(`url(#${id}t)`)}
    </Svg>
  );
}

/** A video camera with a glass medical cross over its corner. */
export function ConsultIcon({ size }: { size: number }) {
  return (
    <GlassGlyph
      size={size}
      back={`${roundRect(2.5, 5.5, 19, 15, 4.5)} M23 11.1 L27.4 8.4 C28.4 7.8 29.6 8.5 29.6 9.7 V16.3 C29.6 17.5 28.4 18.2 27.4 17.6 L23 14.9 Z`}
      glass={plus(19.5, 20.5, 6.6, 3.1, 1.6)}
    />
  );
}

/** The Arc pod: an arched booth, with a glass screen showing a pulse across its doorway. */
export function PodIcon({ size }: { size: number }) {
  return (
    <GlassGlyph
      size={size}
      // The arch with its doorway cut out (even-odd), standing on a base.
      back="M4.5 27 V13.5 C4.5 7.7 9.2 3 15 3 H17 C22.8 3 27.5 7.7 27.5 13.5 V27 Z M9.5 27 V14.5 C9.5 10.6 12.4 7.8 16 7.8 C19.6 7.8 22.5 10.6 22.5 14.5 V27 Z M3 27 H29 V28.2 C29 29.2 28.2 30 27.2 30 H4.8 C3.8 30 3 29.2 3 28.2 Z"
      glass={roundRect(7, 13, 18, 11, 3)}
      marks={() => (
        <Path
          d="M10.4 18.6 H13.6 L15.2 15.6 L17.6 21.4 L19.2 18.6 H21.8"
          stroke={MARK}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    />
  );
}

/** A glass capsule, half tinted, in front of a scored tablet. */
export function MedicinesIcon({ size }: { size: number }) {
  return (
    <GlassGlyph
      size={size}
      back="M15.5 10 A6.5 6.5 0 1 0 28.5 10 A6.5 6.5 0 1 0 15.5 10 Z"
      backMarks={
        <Path
          d="M19.6 6.2 L25.8 12.4"
          stroke="#FFFFFF"
          strokeOpacity={0.75}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      }
      glass="M13.707 11.222 A5 5 0 0 1 20.778 18.293 L12.293 26.778 A5 5 0 0 1 5.222 19.707 Z"
      marks={(tint) => (
        <>
          {/* The capsule's far half, tinted orange inside the glass. */}
          <Path
            d="M9.464 15.464 L5.222 19.707 A5 5 0 0 0 12.293 26.778 L16.536 22.536 Z"
            fill={tint}
          />
          <Path
            d="M9.464 15.464 L16.536 22.536"
            stroke={MARK}
            strokeOpacity={0.55}
            strokeWidth={1.1}
          />
        </>
      )}
    />
  );
}

/** A face in a glass scan frame, an orange heart behind its corner: the face scan. */
export function FaceScanIcon({ size }: { size: number }) {
  return (
    <GlassGlyph
      size={size}
      back="M22 17.5 C18 14.5 15.5 12.3 15.5 9.4 C15.5 7.3 17.1 5.7 19.1 5.7 C20.4 5.7 21.4 6.3 22 7.3 C22.6 6.3 23.6 5.7 24.9 5.7 C26.9 5.7 28.5 7.3 28.5 9.4 C28.5 12.3 26 14.5 22 17.5 Z"
      glass={roundRect(3.5, 9.5, 19, 19, 5)}
      marks={() => (
        <Path
          // The frame's four corners, then two eyes and a smile.
          d="M6.5 15 V13.8 Q6.5 12.5 7.8 12.5 H9 M17 12.5 H18.2 Q19.5 12.5 19.5 13.8 V15 M6.5 23 V24.2 Q6.5 25.5 7.8 25.5 H9 M17 25.5 H18.2 Q19.5 25.5 19.5 24.2 V23 M11 16.7 V17.9 M15 16.7 V17.9 M10.6 21 Q13 23 15.4 21"
          stroke={MARK}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      )}
    />
  );
}

/** Two sheets: an orange one behind, a glass one in front with lines of text. */
export function RecordsIcon({ size }: { size: number }) {
  return (
    <GlassGlyph
      size={size}
      back={roundRect(11, 3, 17, 21, 4)}
      glass={roundRect(4.5, 8, 17.5, 21.5, 4)}
      marks={() => (
        <Path
          d="M9 15.2 H17.5 M9 19.6 H17.5 M9 24 H13.8"
          stroke={MARK}
          strokeWidth={1.9}
          strokeLinecap="round"
        />
      )}
    />
  );
}
