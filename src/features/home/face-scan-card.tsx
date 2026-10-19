import { ScanFace } from 'lucide-react-native';
import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Dish } from '@/components/ui/dish';
import { Glass } from '@/components/ui/glass';
import { Colors, Fonts, Glass as GlassTokens, Radius, Spacing } from '@/constants/theme';
import { scanWhen } from '@/features/face-scan/use-face-scans';
import { type FaceScan, type VitalCode } from '@/features/face-scan/vitals';

import { FaceScanIcon } from './action-icons';

const DISH = 64;

/** Short names, so three readings share one line. */
const SHORT: Partial<Record<VitalCode, { label: string; unit: string }>> = {
  heart_rate: { label: 'Heart rate', unit: 'bpm' },
  breathing_rate: { label: 'Breathing', unit: '/min' },
  hrv: { label: 'Variability', unit: 'ms' },
};

/**
 * Face scan on Home: what it does, the last scan's readings when there is one, and one button to
 * scan. Sits above "Ekaay noticed".
 */
export function FaceScanCard({ latest, onScan }: { latest?: FaceScan; onScan: () => void }) {
  const readings = (latest?.vitals ?? []).filter((vital) => SHORT[vital.code]);

  return (
    <Glass style={styles.card}>
      <View style={styles.top}>
        <View style={styles.copy}>
          <ThemedText style={styles.kicker}>Face scan</ThemedText>
          <ThemedText style={styles.title}>Check your vitals in 40 seconds</ThemedText>
          <ThemedText style={styles.body}>
            Look into your front camera to see your heart rate and breathing.
          </ThemedText>
        </View>
        <Dish size={DISH} tint="warm" lifted>
          <FaceScanIcon size={40} />
        </Dish>
      </View>

      {latest && readings.length ? (
        <View
          style={styles.latest}
          accessible
          accessibilityLabel={`Last scan ${scanWhen(latest.measuredAt)}: ${readings
            .map(({ code, value }) => `${SHORT[code]!.label} ${value} ${SHORT[code]!.unit}`)
            .join(', ')}`}>
          <View style={styles.readings}>
            {readings.map(({ code, value }, i) => (
              <Fragment key={code}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.reading}>
                  <View style={styles.valueRow}>
                    <ThemedText style={styles.value}>{value}</ThemedText>
                    <ThemedText style={styles.unit}>{SHORT[code]!.unit}</ThemedText>
                  </View>
                  <ThemedText style={styles.label} numberOfLines={1}>
                    {SHORT[code]!.label}
                  </ThemedText>
                </View>
              </Fragment>
            ))}
          </View>
          <ThemedText style={styles.when}>
            Last scan {scanWhen(latest.measuredAt).replace(/^(Today|Yesterday)/, (day) => day.toLowerCase())}
          </ThemedText>
        </View>
      ) : null}

      <Pressable
        onPress={onScan}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
        <ScanFace size={17} color={Colors.onInk} strokeWidth={2.4} />
        <ThemedText style={styles.buttonText}>{latest ? 'Scan again' : 'Start face scan'}</ThemedText>
      </Pressable>
    </Glass>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three - 2,
    padding: Spacing.three,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  // As on "Ekaay noticed": a small orange kicker over the title.
  kicker: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.primaryDeep,
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
  // The last scan under a hairline, its readings in columns: no box inside the card.
  latest: {
    gap: Spacing.two,
    paddingTop: Spacing.three - 4,
    borderTopWidth: 1,
    borderTopColor: GlassTokens.hairline,
  },
  readings: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  reading: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: GlassTokens.hairline,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  value: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 16,
    color: Colors.textSoft,
  },
  when: {
    textAlign: 'center',
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  // The card's one action, like "Ekaay noticed"'s.
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primaryBright,
    boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.3), 0 4px 12px rgba(160, 50, 0, 0.18)',
  },
  buttonPressed: {
    backgroundColor: Colors.primaryDeep,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontFamily: Fonts.bold,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.onInk,
  },
});
