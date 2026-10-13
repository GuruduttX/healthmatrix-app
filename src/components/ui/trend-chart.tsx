import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';

import { smoothPath } from './sparkline';

export type TrendPoint = { label: string; value: number };

type TrendChartProps = {
  points: TrendPoint[];
  /** Upper edge of the normal range, drawn as a green band. */
  normalMax: number;
  /** Read out by screen readers, e.g. "Fasting sugar in mg/dL". */
  description: string;
};

const HEIGHT = 112;
const TOP = 26; // room for value labels
const BOTTOM = 22; // room for date labels
const SIDE = 38;

/** A few labelled readings over time, drawn against the normal range. */
export function TrendChart({ points, normalMax, description }: TrendChartProps) {
  const [width, setWidth] = useState(0);

  const values = points.map((point) => point.value);
  const low = Math.min(...values, normalMax) - 10;
  const high = Math.max(...values) + 4;
  const plotBottom = HEIGHT - BOTTOM;
  const y = (value: number) => TOP + (1 - (value - low) / (high - low)) * (plotBottom - TOP);

  const plotted = points.map((point, i) => ({
    ...point,
    x: SIDE + (i / Math.max(points.length - 1, 1)) * (width - SIDE * 2),
    y: y(point.value),
  }));
  const bandTop = y(normalMax);

  return (
    <View
      style={styles.chart}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityLabel={`${description}: ${points
        .map((point) => `${point.value} in ${point.label}`)
        .join(', ')}`}>
      {width > 0 ? (
        <>
          <Svg width={width} height={HEIGHT}>
            <Rect
              x={0}
              y={bandTop}
              width={width}
              height={plotBottom - bandTop}
              rx={8}
              fill={Colors.goodSoft}
            />
            <Path
              d={smoothPath(plotted)}
              stroke={Colors.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              fill="none"
            />
            {plotted.map((point) => (
              <Circle
                key={point.label}
                cx={point.x}
                cy={point.y}
                r={5}
                fill={Colors.backgroundElement}
                stroke={Colors.primary}
                strokeWidth={2.5}
              />
            ))}
          </Svg>

          <ThemedText style={[styles.bandLabel, { top: plotBottom - 18 }]}>normal range</ThemedText>
          {plotted.map((point) => (
            <View key={point.label} style={[styles.pointLabels, { left: point.x - SIDE }]}>
              <ThemedText style={[styles.valueLabel, { top: point.y - 24 }]}>{point.value}</ThemedText>
              <ThemedText style={styles.dateLabel}>{point.label}</ThemedText>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: HEIGHT,
  },
  // Right aligned: the oldest reading sits at the left edge of the band.
  bandLabel: {
    position: 'absolute',
    right: 10,
    fontFamily: Fonts.semibold,
    fontSize: 10,
    lineHeight: 14,
    color: Colors.good,
  },
  pointLabels: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SIDE * 2,
    alignItems: 'center',
  },
  valueLabel: {
    position: 'absolute',
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 16,
  },
  dateLabel: {
    position: 'absolute',
    bottom: 0,
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textFaint,
  },
});
