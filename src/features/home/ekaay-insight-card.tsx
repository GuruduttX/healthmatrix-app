import { LinearGradient } from 'expo-linear-gradient';
import { CalendarPlus, MessageCircle, Sparkles } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TrendChart } from '@/components/ui/trend-chart';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

import { type Insight } from './sample-data';

type EkaayInsightCardProps = {
  insight: Insight;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
};

/** "Ekaay noticed": one trend, shown on a chart, with the next sensible step. */
export function EkaayInsightCard({
  insight,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: EkaayInsightCardProps) {
  return (
    <LinearGradient
      colors={[Colors.primarySoft, Colors.backgroundElement]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}>
      <View
        style={styles.watermark}
        pointerEvents="none"
        aria-hidden>
        <Sparkles size={120} color={Colors.primary} strokeWidth={1.2} />
      </View>

      <View style={styles.header}>
        <LinearGradient
          colors={[Colors.primaryMid, Colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badge}>
          <Sparkles size={14} color={Colors.onInk} strokeWidth={2.2} />
        </LinearGradient>
        <ThemedText type="smallBold" themeColor="primary">
          Ekaay noticed
        </ThemedText>
      </View>

      <ThemedText style={styles.body}>{insight.text}</ThemedText>

      <TrendChart
        points={insight.points}
        normalMax={insight.normalMax}
        description={`${insight.metric} in ${insight.unit}`}
      />

      <View style={styles.actions}>
        <Button label={primaryLabel} icon={CalendarPlus} onPress={onPrimary} />
        <Button
          label={secondaryLabel}
          icon={MessageCircle}
          variant="secondary"
          onPress={onSecondary}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three - 4,
    padding: Spacing.three,
    borderRadius: Radius.xl - 4,
    borderWidth: 1,
    borderColor: Colors.dangerSoft,
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    top: -18,
    right: -18,
    opacity: 0.07,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
