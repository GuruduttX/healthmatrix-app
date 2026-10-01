import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Sparkline } from '@/components/ui/sparkline';
import { FLAG_STYLES, StatusChip } from '@/components/ui/status-chip';
import { Colors, Fonts, Radius, Shadows } from '@/constants/theme';

import { type Reading } from './sample-data';

export function ReadingCard({ reading }: { reading: Reading }) {
  // Three cards share the row, so on small phones tighten up and let the label wrap.
  const compact = useWindowDimensions().width < 380;

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <ThemedText
        type="caption"
        themeColor="textSecondary"
        numberOfLines={compact ? 2 : 1}
        style={compact && styles.labelCompact}>
        {reading.label}
      </ThemedText>

      <View>
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

      <Sparkline values={reading.trend} color={FLAG_STYLES[reading.flag].color} />
      <StatusChip flag={reading.flag} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    padding: 12,
    borderRadius: Radius.lg,
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
    fontFamily: Fonts.display,
    fontSize: 21,
    lineHeight: 26,
    color: Colors.text,
  },
  valueCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
});
