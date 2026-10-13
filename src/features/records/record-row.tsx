import {
  AlertCircle,
  BadgeCheck,
  CalendarClock,
  Check,
  Clock,
  Eye,
  FileText,
  FlaskConical,
  Pill,
  Sparkles,
  Syringe,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { Chevron, LIST_LEAD, ListRow, listText } from '@/components/ui/list';
import { Skeleton, SkeletonCircle } from '@/components/ui/skeleton';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

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

/** "2026-09-28" -> "28 Sep": the month heading above already says the year. */
export function shortDate(date: string) {
  const [, month, day] = date.split('-').map(Number);
  return `${day} ${MONTHS_SHORT[(month ?? 1) - 1]}`;
}

/** The icon and name each kind of record is shown with. Every kind shares one quiet dish. */
export function iconFor(type: RecordSummary['type']): { icon: LucideIcon; kind: string } {
  if (type === 'prescription') return { icon: Pill, kind: 'Prescription' };
  if (type === 'vaccination') return { icon: Syringe, kind: 'Vaccine' };
  if (type === 'pod_screening') return { icon: FlaskConical, kind: 'Pod screening' };
  return { icon: FileText, kind: 'Lab report' };
}

type RecordTagValue = { label: string; tone: Tone };

/** A flag's icon from its tone and word, so the colour is never the only cue. */
function tagLook({ label, tone }: RecordTagValue): { tone: Tone; icon?: LucideIcon } {
  if (tone === 'success') return { tone, icon: /signed/i.test(label) ? BadgeCheck : Check };
  if (tone === 'warning') return { tone, icon: /due/i.test(label) ? Clock : Eye };
  if (tone === 'danger') return { tone, icon: AlertCircle };
  // "New from your doctor", "Dose 2 on 12 Oct": news, not a status, so not orange.
  if (tone === 'primary') {
    return { tone: 'neutral', icon: /new/i.test(label) ? Sparkles : CalendarClock };
  }
  return { tone };
}

/** A record's or a vaccine's tag as a small flag: an icon and a word. */
export function RecordTag({ tag }: { tag: RecordTagValue }) {
  const { tone, icon } = tagLook(tag);
  return <Tag label={tag.label} tone={tone} icon={icon} />;
}

type RecordRowProps = {
  record: RecordSummary;
  onPress?: () => void;
};

/**
 * One record on a list card: its kind in a round dish, the title with the day at the right, one
 * quiet line and its flag.
 */
export function RecordRow({ record, onPress }: RecordRowProps) {
  const { icon, kind } = iconFor(record.type);
  const day = shortDate(record.date);

  return (
    <ListRow
      leading={<IconTile icon={icon} size={LIST_LEAD} />}
      title={
        <View style={styles.titleRow}>
          <ThemedText style={[listText.title, styles.title]} numberOfLines={1}>
            {record.title}
          </ThemedText>
          <ThemedText style={styles.day} numberOfLines={1}>
            {day}
          </ThemedText>
        </View>
      }
      subtitle={
        <ThemedText style={listText.subtitle} numberOfLines={1}>
          {record.subtitle}
        </ThemedText>
      }
      meta={record.tag ? <RecordTag tag={record.tag} /> : undefined}
      trailing={<Chevron />}
      onPress={onPress}
      accessibilityLabel={`${kind}: ${record.title}, ${day}. ${record.subtitle}${record.tag ? `. ${record.tag.label}` : ''}`}
    />
  );
}

/** A record row's shape while records load, for a list card. */
export function RecordRowSkeleton({ wide }: { wide?: boolean }) {
  return (
    <View style={styles.skeleton}>
      <SkeletonCircle size={LIST_LEAD} />
      <View style={styles.skeletonText}>
        <Skeleton width={wide ? '70%' : '50%'} height={14} />
        <Skeleton width={wide ? '85%' : '65%'} height={11} />
        <Skeleton width={64} height={18} radius={Radius.pill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  title: {
    flex: 1,
  },
  day: {
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textFaint,
    fontVariant: ['tabular-nums'],
  },
  skeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: Spacing.two + 3,
  },
  skeletonText: {
    flex: 1,
    gap: 7,
  },
});
