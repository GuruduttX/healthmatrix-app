import { Activity, Droplet, HeartPulse, Wind, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Sparkline } from '@/components/ui/sparkline';
import { FLAG_STYLES, StatusChip } from '@/components/ui/status-chip';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { type Reading } from './sample-data';

const ICONS: Record<string, LucideIcon> = {
  bp: HeartPulse,
  sugar: Droplet,
  spo2: Wind,
  pulse: Activity,
};

/** One vital in the Home grid: its flag, latest value and recent trend. */
export function ReadingCard({ reading }: { reading: Reading }) {
  const flag = FLAG_STYLES[reading.flag];
  const Icon = ICONS[reading.id] ?? Activity;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${reading.label}: ${reading.value} ${reading.unit}, ${flag.label}`}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: flag.soft }]}>
          <Icon size={17} color={flag.color} strokeWidth={2.3} />
        </View>
        <StatusChip flag={reading.flag} />
      </View>

      <View>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {reading.label}
        </ThemedText>
        <View style={styles.valueRow}>
          <ThemedText style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {reading.value}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted" numberOfLines={1} style={styles.unit}>
            {reading.unit}
          </ThemedText>
        </View>
      </View>

      <Sparkline values={reading.trend} color={flag.color} height={32} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Two per row: grow from a 40% basis so the gap never forces a wrap.
    flexGrow: 1,
    flexBasis: '40%',
    minWidth: 0,
    gap: Spacing.two + 2,
    padding: 14,
    borderRadius: Radius.lg + 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  value: {
    flexShrink: 1,
    fontFamily: Fonts.display,
    fontSize: 26,
    lineHeight: 32,
    color: Colors.text,
  },
  unit: {
    fontFamily: Fonts.medium,
  },
});
