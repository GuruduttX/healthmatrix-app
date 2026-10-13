import { ArrowUpRight, CalendarPlus, ChevronRight, Info, MessageCircle } from 'lucide-react-native';
import { useId, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Path,
  Rect,
  Stop,
  LinearGradient as SvgGradient,
} from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { EkaayMark } from '@/components/ui/ekaay-mark';
import { smoothPath } from '@/components/ui/sparkline';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { type Insight } from './sample-data';

const CHART_HEIGHT = 74;
const TOP = 18; // room for value labels
const BOTTOM = 17; // room for date labels
const SIDE = 26;

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
                <Stop offset="0" stopColor={Colors.primary} stopOpacity={0.16} />
                <Stop offset="1" stopColor={Colors.primary} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            {/* The normal range, as a band along the bottom. */}
            <Rect
              x={0}
              y={bandTop}
              width={width}
              height={plotBottom - bandTop}
              rx={6}
              fill={Colors.goodSoft}
            />
            <Path
              d={`${line} L ${last.x} ${plotBottom} L ${first.x} ${plotBottom} Z`}
              fill={`url(#${fillId})`}
            />
            <Path
              d={line}
              stroke={Colors.primary}
              strokeWidth={2.4}
              strokeLinecap="round"
              fill="none"
            />
            <Circle cx={last.x} cy={last.y} r={9} fill={Colors.primary} fillOpacity={0.14} />
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
                style={[
                  styles.valueLabel,
                  { top: point.y - 19 },
                  point === last && styles.valueLabelLast,
                ]}>
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
  /** The way to a person, always offered next to the AI's reading. */
  onTalkToDoctor: () => void;
};

/**
 * "Ekaay noticed": one trend in plain words, the readings behind it with where they came from,
 * one next step, and a doctor one tap away.
 */
export function EkaayInsightCard({
  insight,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onTalkToDoctor,
}: EkaayInsightCardProps) {
  const first = insight.points[0];
  const latest = insight.points[insight.points.length - 1];
  const change = first && latest ? latest.value - first.value : 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <EkaayMark size={28} shape="square" />
        <ThemedText style={styles.kicker}>Ekaay noticed</ThemedText>
        <View style={styles.aiTag}>
          <ThemedText style={styles.aiTagText}>AI</ThemedText>
        </View>
      </View>

      <View style={styles.copy}>
        <ThemedText style={styles.title}>{insight.title}</ThemedText>
        <ThemedText style={styles.body}>{insight.text}</ThemedText>
      </View>

      <View style={styles.panel}>
        <MiniTrend insight={insight} />
        <View style={styles.divider} />
        <View
          style={styles.metric}
          accessible
          accessibilityLabel={`Latest ${latest?.value} ${insight.unit}${change > 0 ? `, up ${change} since ${first?.label}` : ''}`}>
          <ThemedText style={styles.metricValue}>{latest?.value}</ThemedText>
          <ThemedText style={styles.metricUnit}>{insight.unit}</ThemedText>
          {change > 0 ? (
            <View style={styles.delta}>
              <ArrowUpRight size={12} color={Colors.high} strokeWidth={2.8} />
              <ThemedText style={styles.deltaText}>{change}</ThemedText>
            </View>
          ) : null}
        </View>
      </View>
      <ThemedText style={styles.source}>{insight.source}</ThemedText>

      <View style={styles.actions}>
        <Pressable
          onPress={onPrimary}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]}>
          <CalendarPlus size={16} color={Colors.onInk} strokeWidth={2.4} />
          <ThemedText style={styles.primaryText}>{primaryLabel}</ThemedText>
        </Pressable>
        <Pressable
          onPress={onSecondary}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <MessageCircle size={16} color={Colors.text} strokeWidth={2.2} />
          <ThemedText style={styles.secondaryText}>{secondaryLabel}</ThemedText>
        </Pressable>
      </View>

      <Pressable
        onPress={onTalkToDoctor}
        accessibilityRole="button"
        accessibilityLabel="Not a diagnosis. Talk to a doctor"
        style={({ pressed }) => [styles.human, pressed && styles.pressed]}>
        <View style={styles.humanNote}>
          <Info size={13} color={Colors.textFaint} strokeWidth={2.2} />
          <ThemedText style={styles.humanText}>Not a diagnosis</ThemedText>
        </View>
        <View style={styles.humanLink}>
          <ThemedText style={styles.humanLinkText}>Talk to a doctor</ThemedText>
          <ChevronRight size={15} color={Colors.primaryDeep} strokeWidth={2.4} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three - 2,
    padding: Spacing.three,
    paddingBottom: Spacing.two,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kicker: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.primaryDeep,
  },
  aiTag: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.hairline,
  },
  aiTagText: {
    fontFamily: Fonts.bold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 0.4,
    color: Colors.textFaint,
  },
  copy: {
    gap: 4,
  },
  title: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: Colors.textSoft,
  },
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 4,
    paddingRight: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.well,
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
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textSoft,
  },
  valueLabelLast: {
    color: Colors.primaryDeep,
  },
  dateLabel: {
    position: 'absolute',
    bottom: 0,
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textFaint,
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 6,
    backgroundColor: Colors.hairline,
  },
  metric: {
    minWidth: 60,
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: Colors.text,
  },
  metricUnit: {
    marginTop: -2,
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 15,
    color: Colors.textFaint,
  },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.highSoft,
  },
  deltaText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 15,
    color: Colors.high,
  },
  source: {
    marginTop: -6,
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
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
    minHeight: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryBright,
  },
  primaryPressed: {
    backgroundColor: Colors.primaryDeep,
    transform: [{ scale: 0.98 }],
  },
  primaryText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.onInk,
  },
  secondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
  },
  secondaryText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.text,
  },
  human: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 44,
    marginTop: -2,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
    paddingTop: Spacing.one,
  },
  humanNote: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: 5,
  },
  humanText: {
    flexShrink: 1,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.textFaint,
  },
  humanLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  humanLinkText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  pressed: {
    opacity: 0.7,
  },
});
