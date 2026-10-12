import {
  ChevronRight,
  FileText,
  FlaskConical,
  Pill,
  Syringe,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { Skeleton } from '@/components/ui/skeleton';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';

import { type RecordSummary } from './types';

export const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** The icon and colour each kind of record is shown with. */
export function iconFor(type: RecordSummary['type']): { icon: LucideIcon; tone: Tone; kind: string } {
  if (type === 'prescription') return { icon: Pill, tone: 'success', kind: 'Prescription' };
  if (type === 'vaccination') return { icon: Syringe, tone: 'primary', kind: 'Vaccine' };
  if (type === 'pod_screening') return { icon: FlaskConical, tone: 'warning', kind: 'Pod screening' };
  return { icon: FileText, tone: 'neutral', kind: 'Lab report' };
}

type RecordRowProps = {
  record: RecordSummary;
  /** Draws the timeline rail down to the next row. */
  isLast: boolean;
  onPress?: () => void;
};

/** One entry on the records timeline: the day on a rail, then the record card. */
export function RecordRow({ record, isLast, onPress }: RecordRowProps) {
  const [, month, day] = record.date.split('-').map(Number);
  const { icon, tone, kind } = iconFor(record.type);

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={styles.date}>
          <ThemedText style={styles.day}>{day}</ThemedText>
          <ThemedText style={styles.month}>{MONTHS_SHORT[(month ?? 1) - 1]}</ThemedText>
        </View>
        {isLast ? null : <View style={styles.line} />}
      </View>

      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${kind}: ${record.title}. ${record.subtitle}`}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        <IconTile icon={icon} tone={tone} size={44} />
        <View style={styles.text}>
          <ThemedText style={styles.kind}>{kind}</ThemedText>
          <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
            {record.title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
            {record.subtitle}
          </ThemedText>
          {record.tag ? (
            <View style={styles.tag}>
              <Tag label={record.tag.label} tone={record.tag.tone} />
            </View>
          ) : null}
        </View>
        <ChevronRight size={18} color={Colors.textMuted} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

/** A timeline row's shape while records load. */
export function RecordRowSkeleton({ isLast, wide }: { isLast: boolean; wide?: boolean }) {
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={styles.date}>
          <Skeleton width={22} height={18} />
          <Skeleton width={26} height={10} style={styles.skeletonMonth} />
        </View>
        {isLast ? null : <View style={styles.line} />}
      </View>
      <View style={styles.card}>
        <Skeleton width={44} height={44} radius={Radius.md} />
        <View style={styles.text}>
          <Skeleton width={70} height={10} />
          <Skeleton width={wide ? '85%' : '65%'} height={14} style={styles.skeletonLine} />
          <Skeleton width={wide ? '60%' : '75%'} height={11} style={styles.skeletonLine} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two + 4,
  },
  rail: {
    width: 40,
    alignItems: 'center',
  },
  date: {
    width: 40,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  day: {
    fontFamily: Fonts.display,
    fontSize: 17,
    lineHeight: 20,
  },
  month: {
    fontFamily: Fonts.semibold,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: 6,
    borderRadius: 1,
    backgroundColor: Colors.backgroundSelected,
  },
  card: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    marginBottom: Spacing.three - 4,
    padding: 14,
    borderRadius: Radius.lg + 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.card,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  text: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  kind: {
    fontFamily: Fonts.bold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  tag: {
    marginTop: 6,
  },
  skeletonMonth: {
    marginTop: 4,
  },
  skeletonLine: {
    marginTop: 6,
  },
});
