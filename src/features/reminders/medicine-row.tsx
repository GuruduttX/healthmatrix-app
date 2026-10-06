import { Pill } from 'lucide-react-native';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconTile } from '@/components/ui/icon-tile';
import { Tag } from '@/components/ui/tag';
import { Colors, Fonts, Spacing } from '@/constants/theme';

import {
  describeDose,
  describeRepeat,
  formatDay,
  formatShortDate,
  formatTime,
  hasEnded,
  nextDose,
} from './schedule';
import { type MedicineReminder } from './types';

type MedicineRowProps = {
  reminder: MedicineReminder;
  now: Date;
  today: string;
  onPress: () => void;
  onToggleActive: (active: boolean) => void;
  divider?: boolean;
};

/** A medicine in the list: what, when, how often, and a switch to pause its reminders. */
export function MedicineRow({
  reminder,
  now,
  today,
  onPress,
  onToggleActive,
  divider,
}: MedicineRowProps) {
  const ended = hasEnded(reminder, today);
  const next = ended ? null : nextDose(reminder, now);
  const detail = describeDose(reminder);

  const status = !reminder.isActive
    ? { label: 'Paused', tone: 'neutral' as const }
    : ended
      ? { label: 'Course finished', tone: 'neutral' as const }
      : reminder.startsOn > today
        ? {
            label: `Starts ${formatShortDate(reminder.startsOn)}`,
            tone: 'warning' as const,
          }
        : null;

  const schedule = [
    reminder.times.map(formatTime).join(', '),
    describeRepeat(reminder),
    reminder.frequency !== 'once' && reminder.endsOn && !ended
      ? `until ${formatShortDate(reminder.endsOn)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    // The switch sits beside the tappable area, not inside it, so flipping it never opens the editor.
    <View style={[styles.row, divider && styles.divider]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityHint="Edit this medicine"
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <IconTile
          icon={Pill}
          tone={reminder.isActive && !ended ? 'primary' : 'neutral'}
          size={40}
        />

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <ThemedText type="bodyBold" numberOfLines={1} style={styles.title}>
              {reminder.name}
            </ThemedText>
            {status ? <Tag label={status.label} tone={status.tone} /> : null}
          </View>
          {detail ? (
            <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
              {detail}
            </ThemedText>
          ) : null}
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={2}>
            {schedule}
          </ThemedText>
          {next && reminder.isActive ? (
            <ThemedText type="caption" themeColor="primary" style={styles.next}>
              Next: {formatDay(next.date, today)}, {formatTime(next.time)}
            </ThemedText>
          ) : null}
        </View>
      </Pressable>

      {ended ? null : (
        <Switch
          value={reminder.isActive}
          onValueChange={onToggleActive}
          accessibilityLabel={`Reminders for ${reminder.name}`}
          trackColor={{ false: Colors.border, true: Colors.success }}
          thumbColor={Colors.backgroundElement}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: Spacing.two + 4,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  next: {
    marginTop: 2,
    fontFamily: Fonts.semibold,
  },
});
