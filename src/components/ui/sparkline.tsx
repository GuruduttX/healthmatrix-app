import { useId, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export type Point = { x: number; y: number };

/** Smooth path through the points, flat at each point so the line never overshoots. */
export function smoothPath(points: Point[]) {
  return points
    .map((point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      const prev = points[i - 1]!;
      const midX = (prev.x + point.x) / 2;
      return `C ${midX} ${prev.y} ${midX} ${point.y} ${point.x} ${point.y}`;
    })
    .join(' ');
}

type SparklineProps = {
  values: number[];
  color: string;
  height?: number;
};

/** Tiny trend line with a soft fill and a dot on the latest value. */
export function Sparkline({ values, color, height = 30 }: SparklineProps) {
  const [width, setWidth] = useState(0);
  const gradientId = useId().replace(/[^a-zA-Z0-9]/g, '');

  const pad = 4;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Keep a minimum span so a steady reading (97, 98, 97) reads as steady, not as a wild swing.
  const span = Math.max(max - min, Math.abs(max) * 0.06, 1);
  const base = (max + min) / 2 - span / 2;
  const points = values.map((value, i) => ({
    x: pad + (i / Math.max(values.length - 1, 1)) * (width - pad * 2),
    y: pad + (1 - (value - base) / span) * (height - pad * 2),
  }));
  const line = smoothPath(points);
  const last = points[points.length - 1];

  return (
    <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && last ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path
            d={`${line} L ${last.x} ${height} L ${points[0]!.x} ${height} Z`}
            fill={`url(#${gradientId})`}
          />
          <Path d={line} stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
          <Circle cx={last.x} cy={last.y} r={3} fill={color} />
        </Svg>
      ) : null}
    </View>
  );
}
