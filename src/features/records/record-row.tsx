import {
  FileText,
  FlaskConical,
  MessageSquareText,
  Syringe,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Spacing } from '@/constants/theme';

import { type RecordItem } from './sample-data';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function iconFor(record: RecordItem): { icon: LucideIcon; tone: Tone } {
  if (record.type === 'vaccination') return { icon: Syringe, tone: 'primary' };
  if (record.type === 'pod_screening') return { icon: FlaskConical, tone: 'primary' };
  if (record.source === 'whatsapp') return { icon: MessageSquareText, tone: 'success' };
  return { icon: FileText, tone: 'neutral' };
}

type RecordRowProps = {
  record: RecordItem;
  /** Draws the timeline rail down to the next row. */
  isLast: boolean;
};

/** One entry on the records timeline: the day on a rail, then the record card. */
export function RecordRow({ record, isLast }: RecordRowProps) {
  const [, month, day] = record.date.split('-').map(Number);
  const { icon, tone } = iconFor(record);

  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <ThemedText style={styles.day}>{day}</ThemedText>
        <ThemedText style={styles.month}>{MONTHS_SHORT[(month ?? 1) - 1]}</ThemedText>
        {isLast ? null : <View style={styles.line} />}
      </View>

      <Surface style={styles.card}>
        <IconTile icon={icon} tone={tone} />
        <View style={styles.text}>
          <ThemedText type="smallBold" style={styles.title}>
            {record.title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {record.subtitle}
          </ThemedText>
          {record.tag ? (
            <View style={styles.tag}>
              <Tag label={record.tag.label} tone={record.tag.tone} />
            </View>
          ) : null}
        </View>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two + 2,
  },
  rail: {
    width: 34,
    alignItems: 'center',
    paddingTop: 12,
  },
  day: {
    fontFamily: Fonts.display,
    fontSize: 18,
    lineHeight: 20,
  },
  month: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.textMuted,
  },
  line: {
    flex: 1,
    width: 2,
    marginTop: 6,
    borderRadius: 1,
    backgroundColor: Colors.border,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.two + 4,
    marginBottom: Spacing.two + 2,
  },
  text: {
    flex: 1,
    gap: 1,
  },
  title: {
    fontSize: 15,
  },
  tag: {
    marginTop: 6,
  },
});
