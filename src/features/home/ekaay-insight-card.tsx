import { LinearGradient } from 'expo-linear-gradient';
import { ArrowUpRight, CalendarPlus, Info, MessageCircle, Sparkles } from 'lucide-react-native';
import { useId, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, Rect, Stop, LinearGradient as SvgGradient } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { smoothPath } from '@/components/ui/sparkline';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { type Insight } from './sample-data';

const CHART_HEIGHT = 66;
const TOP = 16; // room for value labels
const BOTTOM = 16; // room for date labels
const SIDE = 24;

/** The insight's readings as a slim line over the normal range, labelled at each point. */
function MiniTrend({ insight }: { insight: Insight }) {
  const [width, setWidth] = useState(0);
  const fillId = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { points, normalMax } = insight;

  const values = points.map((point) => point.value);
  const low = Math.min(...values, normalMax) - 8;
  const high = Math.max(...values) + 4;
  const plotBottom = CHART_HEIGHT - BOTTOM;
  const y = (value: number) => TOP + (1 - (value - low) / (high - low)) * (plotBottom - TOP);
  const plotted = points.map((point, i) => ({
    ...point,
    x: SIDE + (i / Math.max(points.length - 1, 1)) * (width - SIDE * 2),
    y: y(point.value),
  }));
  const line = smoothPath(plotted);
  const first = plotted[0];
  const last = plotted[plotted.length - 1];
  const bandTop = y(normalMax);

  return (
    <View
      style={styles.chart}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityLabel={`${insight.metric} in ${insight.unit}: ${points
        .map((point) => `${point.value} in ${point.label}`)
        .join(', ')}. Normal is up to ${normalMax}.`}>
      {width > 0 && first && last ? (
        <>
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <SvgGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={Colors.primary} stopOpacity={0.2} />
                <Stop offset="1" stopColor={Colors.primary} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            <Rect
              x={0}
              y={bandTop}
              width={width}
              height={plotBottom - bandTop}
              rx={6}
              fill={Colors.successSoft}
            />
            <Path
              d={`${line} L ${last.x} ${plotBottom} L ${first.x} ${plotBottom} Z`}
              fill={`url(#${fillId})`}
            />
            <Path d={line} stroke={Colors.primary} strokeWidth={2.2} strokeLinecap="round" fill="none" />
            {plotted.map((point) =>
              point === last ? (
                <Circle key={point.label} cx={point.x} cy={point.y} r={8} fill={Colors.primary} fillOpacity={0.16} />
              ) : null,
            )}
            {plotted.map((point) => (
              <Circle
                key={point.label}
                cx={point.x}
                cy={point.y}
                r={point === last ? 4.5 : 3.5}
                fill={point === last ? Colors.primary : Colors.backgroundElement}
                stroke={Colors.primary}
                strokeWidth={2}
              />
            ))}
          </Svg>

          {plotted.map((point) => (
            <View key={point.label} style={[styles.pointLabels, { left: point.x - SIDE }]}>
              <ThemedText
                style={[styles.valueLabel, { top: point.y - 17 }, point === last && styles.valueLabelLast]}>
                {point.value}
              </ThemedText>
              <ThemedText style={styles.dateLabel} numberOfLines={1}>
                {point.label}
              </ThemedText>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

type EkaayInsightCardProps = {
  insight: Insight;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
};

/** "Ekaay noticed": one trend, its latest value and the next sensible step, in one compact card. */
export function EkaayInsightCard({
  insight,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: EkaayInsightCardProps) {
  const first = insight.points[0];
  const latest = insight.points[insight.points.length - 1];
  const change = first && latest ? latest.value - first.value : 0;

  return (
    // Gradients are background layers inside plain Views that do the rounding and clipping,
    // which renders the same on iOS, Android and web. The shadow sits outside the clip.
    <View style={styles.shadow}>
      <View style={styles.frame}>
        {/* A thin gradient frame marks the card as Ekaay's. */}
        <LinearGradient
          colors={[Colors.primaryMid, Colors.primaryLight, FRAME_END]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.card}>
          {/* Warm light from the top-right corner, gone before the chart. */}
          <LinearGradient
            colors={[GLOW, 'rgba(246, 175, 145, 0)']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.35, y: 0.6 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <View style={styles.header}>
            <LinearGradient
              colors={[Colors.primaryMid, Colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.badge}>
              <Sparkles size={13} color={Colors.onInk} strokeWidth={2.4} />
            </LinearGradient>
            <ThemedText style={styles.kicker}>Ekaay noticed</ThemedText>
            <View style={styles.flex} />
            <Info size={12} color={Colors.textMuted} strokeWidth={2.2} />
            <ThemedText type="caption" themeColor="textMuted" style={styles.note}>
              Not a diagnosis
            </ThemedText>
          </View>

          <View style={styles.copy}>
            <ThemedText style={styles.title}>{insight.title}</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary" style={styles.body}>
              {insight.text}
            </ThemedText>
          </View>

          <View style={styles.panel}>
            <MiniTrend insight={insight} />
            <View style={styles.divider} />
            <View
              style={styles.metric}
              accessible
              accessibilityLabel={`Latest ${latest?.value} ${insight.unit}${change > 0 ? `, up ${change} since ${first?.label}` : ''}`}>
              <ThemedText style={styles.metricValue}>{latest?.value}</ThemedText>
              <ThemedText type="caption" themeColor="textMuted" style={styles.metricUnit}>
                {insight.unit}
              </ThemedText>
              {change > 0 ? (
                <View style={styles.delta}>
                  <ArrowUpRight size={12} color={Colors.danger} strokeWidth={2.6} />
                  <ThemedText style={styles.deltaText}>{change}</ThemedText>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onPrimary}
              accessibilityRole="button"
              style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
              <CalendarPlus size={15} color={Colors.onInk} strokeWidth={2.4} />
              <ThemedText type="smallBold" themeColor="onInk">
                {primaryLabel}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={onSecondary}
              accessibilityRole="button"
              style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
              <MessageCircle size={15} color={Colors.primary} strokeWidth={2.4} />
              <ThemedText type="smallBold" themeColor="primary">
                {secondaryLabel}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const FRAME = 1.5;
/** Peach, still visible on the page colour, so the frame never fades out at the far corner. */
const FRAME_END = 'rgba(246, 175, 145, 0.6)';
const GLOW = 'rgba(246, 175, 145, 0.3)';

const styles = StyleSheet.create({
  shadow: {
    borderRadius: Radius.xl,
    boxShadow: '0 10px 28px rgba(221, 67, 1, 0.1)',
  },
  frame: {
    padding: FRAME,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  card: {
    gap: Spacing.three - 4,
    padding: 14,
    borderRadius: Radius.xl - FRAME,
    backgroundColor: Colors.backgroundElement,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: Shadows.glow,
  },
  kicker: {
    marginLeft: 2,
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.primary,
  },
  note: {
    fontSize: 11,
    lineHeight: 14,
  },
  copy: {
    gap: 3,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 18,
    lineHeight: 23,
  },
  body: {
    fontSize: 13,
    lineHeight: 18,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
  },
  chart: {
    flex: 1,
    height: CHART_HEIGHT,
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
    fontSize: 10,
    lineHeight: 12,
    color: Colors.textSecondary,
  },
  valueLabelLast: {
    color: Colors.primary,
  },
  dateLabel: {
    position: 'absolute',
    bottom: 0,
    fontFamily: Fonts.medium,
    fontSize: 10,
    lineHeight: 12,
    color: Colors.textMuted,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
    backgroundColor: Colors.border,
  },
  metric: {
    minWidth: 58,
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 30,
    color: Colors.text,
  },
  metricUnit: {
    marginTop: -2,
    fontSize: 11,
    lineHeight: 14,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 5,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.dangerSoft,
  },
  deltaText: {
    fontFamily: Fonts.bold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.danger,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  primary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    boxShadow: Shadows.glow,
  },
  secondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.primarySoft,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
