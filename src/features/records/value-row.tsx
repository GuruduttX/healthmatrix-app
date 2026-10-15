import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { TONES } from '@/components/ui/icon-tile';
import { Colors, Fonts, Spacing } from '@/constants/theme';

import { type RecordValue } from './record-details';
import { RecordTag } from './record-row';

/** Softer than the text tones so the bar reads as a scale, not an alert. */
const BAND_OPACITY = 0.6;
const MARKER = 16;

type ValueRowProps = {
  item: RecordValue;
  /** Draws a divider above every row but the first. */
  divided: boolean;
};

/** One test value: the number, where it sits on its range, and what that means. */
export function ValueRow({ item, divided }: ValueRowProps) {
  const max = item.bands[item.bands.length - 1]?.upTo ?? item.value;
  const span = max - item.scaleMin || 1;
  const position = Math.min(1, Math.max(0, (item.value - item.scaleMin) / span));

  return (
    <View
      style={[styles.row, divided && styles.divided]}
      accessible
      accessibilityLabel={`${item.name}, ${item.value} ${item.unit}, ${item.status.label}. ${item.range}`}>
      <View style={styles.line}>
        <ThemedText style={[styles.name, styles.title]} numberOfLines={1}>
          {item.name}
        </ThemedText>
        <ThemedText style={styles.value}>
          {item.value}
          <ThemedText style={styles.unit}> {item.unit}</ThemedText>
        </ThemedText>
      </View>

      <View style={styles.barWrap}>
        <View style={styles.bar}>
          {item.bands.map((band, index) => {
            const from = index === 0 ? item.scaleMin : (item.bands[index - 1]?.upTo ?? 0);
            return (
              <View
                key={band.upTo}
                style={{
                  // As shares of 100: on web, flex weights adding up to less than 1 (a 0–0.9
                  // scale) leave the end of the bar empty.
                  flex: ((band.upTo - from) / span) * 100,
                  backgroundColor: TONES[band.tone].color,
                  opacity: BAND_OPACITY,
                }}
              />
            );
          })}
        </View>
        {/* Inset by half a marker so it never hangs off either end of the bar. */}
        <View style={styles.markerTrack}>
          <View style={[styles.marker, { left: `${position * 100}%` }]} />
        </View>
      </View>

      <View style={styles.line}>
        <ThemedText style={[styles.name, styles.range]}>{item.range}</ThemedText>
        <RecordTag tag={item.status} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 6,
    paddingVertical: Spacing.two + 4,
  },
  divided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.hairline,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.text,
  },
  range: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  value: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.3,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  // Nested in the value, so it sets its own line height.
  unit: {
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 22,
    color: Colors.textFaint,
  },
  barWrap: {
    height: MARKER,
    justifyContent: 'center',
  },
  bar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  markerTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: MARKER / 2,
    right: MARKER / 2,
  },
  marker: {
    position: 'absolute',
    width: MARKER,
    height: MARKER,
    marginLeft: -MARKER / 2,
    borderRadius: MARKER / 2,
    borderWidth: 3,
    borderColor: Colors.text,
    backgroundColor: Colors.backgroundElement,
  },
});
