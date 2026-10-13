import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LIST_LEAD, listText } from '@/components/ui/list';
import { Tag } from '@/components/ui/tag';
import { Toggle } from '@/components/ui/toggle';
import { Colors, Fonts, Spacing } from '@/constants/theme';

import { MedicineDish } from './dose-ui';
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
  /** A hairline above the row, starting where the words do. Leave off inside a `ListCard`. */
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
  const running = reminder.isActive && !ended;
  const next = running ? nextDose(reminder, now) : null;
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

  // The schedule above already lists the times; with only one, the day says enough.
  const nextLabel = next
    ? `Next: ${formatDay(next.date, today)}${reminder.times.length > 1 ? `, ${formatTime(next.time)}` : ''}`
    : null;

  return (
    <>
      {divider ? <View style={styles.divider} /> : null}
      {/* The switch sits beside the tappable area, not inside it, so flipping it never opens the editor. */}
      <View style={styles.row}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityHint="Edit this medicine"
          style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
          <MedicineDish size={LIST_LEAD} faded={!running} />

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <ThemedText
                numberOfLines={1}
                style={[styles.title, !running && styles.titleQuiet]}>
                {reminder.name}
              </ThemedText>
              {status ? <Tag label={status.label} tone={status.tone} /> : null}
            </View>
            {detail ? (
              <ThemedText style={styles.subtitle} numberOfLines={1}>
                {detail}
              </ThemedText>
            ) : null}
            <ThemedText style={styles.subtitle} numberOfLines={2}>
              {schedule}
            </ThemedText>
            {nextLabel ? (
              <ThemedText style={styles.next} numberOfLines={1}>
                {nextLabel}
              </ThemedText>
            ) : null}
          </View>
        </Pressable>

        {ended ? null : (
          <Toggle
            value={reminder.isActive}
            onValueChange={onToggleActive}
            accessibilityLabel={`Reminders for ${reminder.name}`}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  main: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: Spacing.two + 4,
  },
  // Starts where the words do, like a list's separators.
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: LIST_LEAD + Spacing.three - 4,
    backgroundColor: Colors.hairline,
  },
  pressed: {
    opacity: 0.6,
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
    ...listText.title,
    flexShrink: 1,
  },
  titleQuiet: {
    color: Colors.textSoft,
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  next: {
    marginTop: 2,
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.primaryDeep,
  },
});
