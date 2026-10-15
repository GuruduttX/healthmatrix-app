import { Image, type ImageSource } from 'expo-image';
import { ArrowDown, ArrowUp, Check, Eye, type LucideIcon } from 'lucide-react-native';
import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Glass } from '@/components/ui/glass';
import { Colors, Fonts, Glass as GlassTokens, Radius, Spacing } from '@/constants/theme';
import { type ReadingFlag } from '@/types';

import { type Reading } from './sample-data';

/** Each flag's word, icon and colours. Words first, so no one has to read the colour. */
export const FLAGS: Record<
  ReadingFlag,
  { label: string; icon: LucideIcon; color: string; soft: string }
> = {
  normal: { label: 'Normal', icon: Check, color: Colors.good, soft: GlassTokens.goodTint },
  watch: { label: 'Watch', icon: Eye, color: Colors.watch, soft: GlassTokens.watchTint },
  borderline: { label: 'Borderline', icon: Eye, color: Colors.watch, soft: GlassTokens.watchTint },
  high: { label: 'High', icon: ArrowUp, color: Colors.high, soft: GlassTokens.highTint },
  low: { label: 'Low', icon: ArrowDown, color: Colors.high, soft: GlassTokens.highTint },
};

/**
 * A short name that fits a quarter of the card, and a 3D picture: Microsoft Fluent Emoji (MIT),
 * see assets/images/home/3d/LICENSE.
 */
const LOOKS: Record<string, { short: string; art: ImageSource; aspect: number }> = {
  bp: { short: 'BP', art: require('@/assets/images/home/3d/vital-bp.png'), aspect: 206 / 224 },
  sugar: {
    short: 'Sugar',
    art: require('@/assets/images/home/3d/vital-sugar.png'),
    aspect: 162 / 224,
  },
  spo2: { short: 'SpO₂', art: require('@/assets/images/home/3d/vital-spo2.png'), aspect: 1 },
  pulse: {
    short: 'Pulse',
    art: require('@/assets/images/home/3d/vital-pulse.png'),
    aspect: 224 / 210,
  },
};

const DISH = 34;
const ART = 21;

/** A small pill with the flag's icon and word. */
export function FlagPill({ flag }: { flag: ReadingFlag }) {
  const { label, icon: Icon, color, soft } = FLAGS[flag];
  return (
    <View style={[styles.pill, { backgroundColor: soft }]}>
      <Icon size={9} color={color} strokeWidth={3} />
      <ThemedText style={[styles.pillText, { color }]} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

/** One vital: its picture, the latest value, its short name and unit on one line, and its flag. */
function Vital({ reading }: { reading: Reading }) {
  const look = LOOKS[reading.id];
  // The art is fitted by its longer side, so tall and wide pictures look the same size.
  const aspect = look?.aspect ?? 1;
  const art = aspect > 1 ? { width: ART, height: ART / aspect } : { width: ART * aspect, height: ART };

  return (
    <View
      style={styles.vital}
      accessible
      accessibilityLabel={`${reading.label}: ${reading.value} ${reading.unit}, ${FLAGS[reading.flag].label}`}>
      {look ? (
        // Glass on the glass card; the art is a layer of its own, above the frost.
        <Glass variant="flat" radius={DISH / 2} wrapperStyle={styles.dishBox} style={styles.dish}>
          <View style={[StyleSheet.absoluteFill, styles.center]}>
            <Image source={look.art} style={art} contentFit="contain" aria-hidden />
          </View>
        </Glass>
      ) : null}
      <ThemedText style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {reading.value}
      </ThemedText>
      <ThemedText style={styles.label} numberOfLines={1}>
        {look?.short ?? reading.label}
        <ThemedText style={styles.unit}> · {reading.unit}</ThemedText>
      </ThemedText>
      <FlagPill flag={reading.flag} />
    </View>
  );
}

/** Home's vitals: all four side by side on one pane of glass, a hairline between each. */
export function VitalsCard({ readings }: { readings: Reading[] }) {
  return (
    <Glass style={styles.card}>
      {readings.map((reading, i) => (
        <Fragment key={reading.id}>
          {i ? <View style={styles.divider} /> : null}
          <Vital reading={reading} />
        </Fragment>
      ))}
    </Glass>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    paddingVertical: Spacing.two + 3,
    paddingHorizontal: Spacing.one,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    marginVertical: Spacing.one,
    backgroundColor: GlassTokens.hairline,
  },
  vital: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  dishBox: {
    marginBottom: Spacing.one + 1,
  },
  dish: {
    width: DISH,
    height: DISH,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    maxWidth: '100%',
    marginBottom: Spacing.one + 2,
    fontFamily: Fonts.semibold,
    fontSize: 10.5,
    lineHeight: 13,
    color: Colors.textSoft,
  },
  value: {
    maxWidth: '100%',
    fontFamily: Fonts.displaySemibold,
    fontSize: 18,
    lineHeight: 21,
    letterSpacing: -0.4,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  // Nested in the label, so it sets its own line height (ThemedText's default is 24).
  unit: {
    fontFamily: Fonts.medium,
    fontSize: 10.5,
    lineHeight: 13,
    color: Colors.textFaint,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: '100%',
    paddingVertical: 2.5,
    paddingLeft: 5,
    paddingRight: 7,
    borderRadius: Radius.pill,
  },
  pillText: {
    flexShrink: 1,
    fontFamily: Fonts.bold,
    fontSize: 10,
    lineHeight: 12.5,
  },
});
