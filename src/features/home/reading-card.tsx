import { Activity, Droplet, HeartPulse, Wind, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Sparkline } from '@/components/ui/sparkline';
import { FLAG_STYLES, StatusChip } from '@/components/ui/status-chip';
import { Colors, Fonts, Radius, Shadows } from '@/constants/theme';

import { type Reading } from './sample-data';

const ICONS: Record<string, LucideIcon> = {
  bp: HeartPulse,
  sugar: Droplet,
  spo2: Wind,
};

export function ReadingCard({ reading }: { reading: Reading }) {
  // Three cards share the row, so on small phones tighten up and let the label wrap.
  const compact = useWindowDimensions().width < 380;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <StatusChip flag={reading.flag} icon={ICONS[reading.id] ?? Activity} />

      <View>
        <ThemedText
          type="caption"
          themeColor="textSecondary"
          numberOfLines={compact ? 2 : 1}
          style={compact && styles.labelCompact}>
          {reading.label}
        </ThemedText>
        <ThemedText
          style={[styles.value, compact && styles.valueCompact]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {reading.value}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          {reading.unit}
        </ThemedText>
      </View>

      <Sparkline values={reading.trend} color={FLAG_STYLES[reading.flag].color} height={22} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    padding: 12,
    borderRadius: Radius.lg + 2,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  cardCompact: {
    padding: 10,
  },
  labelCompact: {
    minHeight: 32,
  },
  value: {
    marginTop: 2,
    fontFamily: Fonts.display,
    fontSize: 22,
    lineHeight: 26,
    color: Colors.text,
  },
  valueCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
});
