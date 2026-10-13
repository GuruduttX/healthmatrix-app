import {
  Activity,
  ArrowDown,
  ArrowUp,
  Check,
  Droplet,
  Eye,
  HeartPulse,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { type ReadingFlag } from '@/types';

import { type Reading } from './sample-data';

const ICONS: Record<string, LucideIcon> = {
  bp: HeartPulse,
  sugar: Droplet,
  spo2: Wind,
  pulse: Activity,
};

/** Each flag's word, icon and colours. Words first, so no one has to read the colour. */
export const FLAGS: Record<
  ReadingFlag,
  { label: string; icon: LucideIcon; color: string; soft: string; zone: string }
> = {
  normal: {
    label: 'Normal',
    icon: Check,
    color: Colors.good,
    soft: Colors.goodSoft,
    zone: '#CFE2EC',
  },
  watch: {
    label: 'Watch',
    icon: Eye,
    color: Colors.watch,
    soft: Colors.watchSoft,
    zone: '#F3DFAE',
  },
  borderline: {
    label: 'Borderline',
    icon: Eye,
    color: Colors.watch,
    soft: Colors.watchSoft,
    zone: '#F3DFAE',
  },
  high: {
    label: 'High',
    icon: ArrowUp,
    color: Colors.high,
    soft: Colors.highSoft,
    zone: '#EEC5CE',
  },
  low: {
    label: 'Low',
    icon: ArrowDown,
    color: Colors.high,
    soft: Colors.highSoft,
    zone: '#EEC5CE',
  },
};

/** A small pill with the flag's icon and word. */
export function FlagPill({ flag }: { flag: ReadingFlag }) {
  const { label, icon: Icon, color, soft } = FLAGS[flag];
  return (
    <View style={[styles.pill, { backgroundColor: soft }]}>
      <Icon size={12} color={color} strokeWidth={2.8} />
      <ThemedText style={[styles.pillText, { color }]}>{label}</ThemedText>
    </View>
  );
}

/** The reading's scale as coloured stretches, with a marker where this reading sits. */
function RangeBar({ scale }: { scale: Reading['scale'] }) {
  const max = scale.zones[scale.zones.length - 1]?.upTo ?? scale.min + 1;
  const span = max - scale.min;
  const at = Math.min(Math.max((scale.at - scale.min) / span, 0), 1);

  return (
    <View style={styles.bar} aria-hidden importantForAccessibility="no-hide-descendants">
      <View style={styles.zones}>
        {scale.zones.map((zone, i) => {
          const from = i === 0 ? scale.min : scale.zones[i - 1]!.upTo;
          return (
            <View
              key={zone.upTo}
              style={[
                styles.zone,
                { flex: zone.upTo - from, backgroundColor: FLAGS[zone.flag].zone },
              ]}
            />
          );
        })}
      </View>
      <View style={[styles.marker, { left: `${at * 100}%` }]} />
    </View>
  );
}

/** One vital in Home's grid: what it is, the latest value, its flag, and where it sits. */
export function VitalCard({ reading }: { reading: Reading }) {
  const Icon = ICONS[reading.id] ?? Activity;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${reading.label}: ${reading.value} ${reading.unit}, ${FLAGS[reading.flag].label}`}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Icon size={15} color={Colors.textSoft} strokeWidth={2.2} />
        </View>
        <FlagPill flag={reading.flag} />
      </View>

      <View>
        <ThemedText style={styles.label} numberOfLines={1}>
          {reading.label}
        </ThemedText>
        <View style={styles.valueRow}>
          <ThemedText
            style={[styles.value, reading.value.length > 5 && styles.valueLong]}
            numberOfLines={1}>
            {reading.value}
          </ThemedText>
          <ThemedText style={styles.unit} numberOfLines={1}>
            {reading.unit}
          </ThemedText>
        </View>
      </View>

      <RangeBar scale={reading.scale} />
    </View>
  );
}

const MARKER = 12;

const styles = StyleSheet.create({
  card: {
    // Two per row: grow from a 40% basis so the gap never forces a wrap.
    flexGrow: 1,
    flexBasis: '40%',
    minWidth: 0,
    gap: Spacing.two + 1,
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderRadius: Radius.xl - 2,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.well,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingLeft: 7,
    paddingRight: 9,
    borderRadius: Radius.pill,
  },
  pillText: {
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 15,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  valueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: 4,
  },
  value: {
    flexShrink: 1,
    fontFamily: Fonts.displaySemibold,
    fontSize: 26,
    lineHeight: 30,
    letterSpacing: -0.6,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  valueLong: {
    fontSize: 23,
    letterSpacing: -0.8,
  },
  unit: {
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textFaint,
  },
  // The marker may stand half its width past either end, into the card's padding.
  bar: {
    height: MARKER,
    justifyContent: 'center',
  },
  zones: {
    flexDirection: 'row',
    gap: 3,
    height: 5,
  },
  zone: {
    borderRadius: 2.5,
  },
  marker: {
    position: 'absolute',
    top: 0,
    width: MARKER,
    height: MARKER,
    marginLeft: -MARKER / 2,
    borderRadius: MARKER / 2,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    backgroundColor: Colors.backgroundElement,
    boxShadow: '0 1px 3px rgba(14, 42, 51, 0.25)',
  },
});
