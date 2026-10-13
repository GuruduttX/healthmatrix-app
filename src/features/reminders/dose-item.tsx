import { Check } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';

import { LEAD, MedicineDish, TickButton, UndoButton } from './dose-ui';
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

/** The word at the start of a line's quiet text, in its flag's colour. */
const FLAGS: Partial<Record<DoseState, { text: string; color: string }>> = {
  taken: { text: 'Taken', color: Colors.good },
  skipped: { text: 'Skipped', color: Colors.textFaint },
  due: { text: 'Due now', color: Colors.primaryDeep },
  missed: { text: 'Not marked', color: Colors.watch },
};

/** Non-breaking spaces inside a phrase, so it never splits across two lines. */
const keepTogether = (phrase: string) => phrase.replace(/ /g, '\u00A0');

type DoseItemProps = {
  dose: Dose;
  state: DoseState;
  onMark: (status: DoseStatus | null) => void;
  /** A hairline above the line, starting where the words do. */
  divider?: boolean;
};

/**
 * One dose, as a line on Home's Today card: the pill, the medicine with when and how much under
 * it, then Skip and the round tick, or a way to undo once it is marked.
 */
export function DoseItem({ dose, state, onMark, divider }: DoseItemProps) {
  const flag = FLAGS[state];
  const marked = state === 'taken' || state === 'skipped';
  const time = formatTime(dose.time);
  const { name, note } = dose.reminder;
  // "Due now" already says when; every other line needs its time. Each phrase holds together, so
  // a long line wraps at a dot ("8:00 AM ·" / "2 tablets"), never inside "2 tablets".
  const detail = [state === 'due' ? null : time, ...describeDose(dose.reminder).split(' · ')]
    .filter((phrase): phrase is string => !!phrase)
    .map(keepTogether)
    .join('\u00A0· ');

  return (
    <>
      {divider ? <View style={styles.divider} /> : null}
      <View style={styles.row}>
        <View>
          <MedicineDish faded={marked} />
          {state === 'taken' ? (
            <View style={styles.badge}>
              <Check size={9} color={Colors.onInk} strokeWidth={3.4} />
            </View>
          ) : null}
        </View>

        <View style={styles.body}>
          <ThemedText
            numberOfLines={1}
            style={[styles.title, marked && styles.titleMarked, state === 'skipped' && styles.struck]}>
            {name}
          </ThemedText>
          <ThemedText style={styles.subtitle} numberOfLines={2}>
            {flag ? (
              <ThemedText style={[styles.flag, { color: flag.color }]}>
                {keepTogether(flag.text)}
                {detail ? '\u00A0· ' : ''}
              </ThemedText>
            ) : null}
            {detail}
          </ThemedText>
          {note ? (
            <ThemedText style={styles.note} numberOfLines={2}>
              {note}
            </ThemedText>
          ) : null}
        </View>

        {state === 'upcoming' ? null : marked ? (
          <UndoButton
            onPress={() => onMark(null)}
            accessibilityLabel={`Undo, ${name} at ${time}`}
          />
        ) : (
          <View style={styles.actions}>
            <Pressable
              onPress={() => onMark('skipped')}
              accessibilityRole="button"
              accessibilityLabel={`Skip ${name} at ${time}`}
              hitSlop={8}
              style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
              <ThemedText style={styles.skipText}>Skip</ThemedText>
            </Pressable>
            <TickButton
              look={state === 'due' ? 'solid' : 'soft'}
              onPress={() => onMark('taken')}
              accessibilityLabel={`Mark ${name} at ${time} taken`}
            />
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    paddingVertical: Spacing.two + 2,
  },
  // Starts where the words do, like a list's separators.
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: LEAD + Spacing.three - 4,
    backgroundColor: Colors.hairline,
  },
  // A small tick on the dish's edge once the dose is taken.
  badge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.backgroundElement,
    backgroundColor: Colors.good,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.text,
  },
  titleMarked: {
    color: Colors.textSoft,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  subtitle: {
    fontFamily: Fonts.medium,
    fontSize: 12.5,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  // Nested in the subtitle, so it sets its own line height (ThemedText's default is 24).
  flag: {
    fontFamily: Fonts.bold,
    fontSize: 12.5,
    lineHeight: 17,
  },
  note: {
    marginTop: 1,
    fontFamily: Fonts.medium,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textFaint,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  skip: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  skipText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  pressed: {
    opacity: 0.6,
  },
});
