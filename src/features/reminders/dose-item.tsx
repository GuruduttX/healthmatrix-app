import { Check, Pill, SkipForward, Undo2 } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconTile } from '@/components/ui/icon-tile';
import { Tag } from '@/components/ui/tag';
import { Colors, Spacing } from '@/constants/theme';

import { describeDose, formatTime, type Dose } from './schedule';
import { type DoseStatus } from './types';

/** How long after its time an unmarked dose still counts as "due" rather than "missed". */
const DUE_WINDOW_MS = 60 * 60 * 1000;

export type DoseState = 'taken' | 'skipped' | 'due' | 'missed' | 'later' | 'upcoming';

/** Where a dose stands right now. Doses on future days cannot be marked yet. */
export function doseState(dose: Dose, now: Date, today: string): DoseState {
  if (dose.status) return dose.status;
  if (dose.date > today) return 'upcoming';
  const late = now.getTime() - dose.at.getTime();
  if (late < 0) return 'later';
  return late <= DUE_WINDOW_MS ? 'due' : 'missed';
}

const LABELS: Record<DoseState, { text: string; tone: 'success' | 'neutral' | 'warning' | 'primary' } | null> = {
  taken: { text: 'Taken', tone: 'success' },
  skipped: { text: 'Skipped', tone: 'neutral' },
  due: { text: 'Due now', tone: 'primary' },
  missed: { text: 'Not marked', tone: 'warning' },
  later: null,
  upcoming: null,
};

type DoseItemProps = {
  dose: Dose;
  state: DoseState;
  onMark: (status: DoseStatus | null) => void;
  divider?: boolean;
};

/** One dose: its time, the medicine, and Take / Skip, or Undo once marked. */
export function DoseItem({ dose, state, onMark, divider }: DoseItemProps) {
  const label = LABELS[state];
  const marked = state === 'taken' || state === 'skipped';
  const detail = describeDose(dose.reminder);

  return (
    <View style={[styles.row, divider && styles.divider, marked && styles.marked]}>
      <View style={styles.time}>
        <ThemedText type="smallBold" themeColor={state === 'missed' ? 'warning' : 'text'}>
          {formatTime(dose.time)}
        </ThemedText>
        {label ? <Tag label={label.text} tone={label.tone} /> : null}
      </View>

      <IconTile icon={Pill} tone={state === 'taken' ? 'success' : 'primary'} size={36} />

      <View style={styles.body}>
        <ThemedText
          type="smallBold"
          numberOfLines={1}
          style={state === 'skipped' && styles.struck}
          themeColor={marked ? 'textSecondary' : 'text'}>
          {dose.reminder.name}
        </ThemedText>
        {detail ? (
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {detail}
          </ThemedText>
        ) : null}
        {dose.reminder.note ? (
          <ThemedText type="caption" themeColor="textMuted" numberOfLines={2}>
            {dose.reminder.note}
          </ThemedText>
        ) : null}
      </View>

      {state === 'upcoming' ? null : marked ? (
        <Pressable
          onPress={() => onMark(null)}
          accessibilityRole="button"
          accessibilityLabel={`Undo, ${dose.reminder.name} at ${formatTime(dose.time)}`}
          hitSlop={8}
          style={({ pressed }) => [styles.undo, pressed && styles.pressed]}>
          <Undo2 size={16} color={Colors.textSecondary} strokeWidth={2.2} />
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Pressable
            onPress={() => onMark('skipped')}
            accessibilityRole="button"
            accessibilityLabel={`Skip ${dose.reminder.name} at ${formatTime(dose.time)}`}
            hitSlop={6}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
            <SkipForward size={16} color={Colors.textSecondary} strokeWidth={2.2} />
          </Pressable>
          <Pressable
            onPress={() => onMark('taken')}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${dose.reminder.name} at ${formatTime(dose.time)} taken`}
            hitSlop={6}
            style={({ pressed }) => [styles.take, pressed && styles.pressed]}>
            <Check size={20} color={Colors.onInk} strokeWidth={3} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    paddingVertical: Spacing.two + 4,
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  marked: {
    opacity: 0.85,
  },
  time: {
    width: 74,
    gap: 4,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  skip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundSelected,
  },
  take: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    boxShadow: '0 6px 14px rgba(16, 128, 109, 0.35)',
  },
  undo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
});
