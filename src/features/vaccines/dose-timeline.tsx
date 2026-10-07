import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { istToday } from '@/features/doctors/time';
import { daysBetween, formatDay, formatShortDate } from '@/features/reminders/schedule';

import { type VaccinationRecord, type VaccineDose } from './types';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "Given on 6 Oct", "Due today", "Was due 2 days ago (6 Oct)", "Due in 7 days (13 Oct)" */
function statusLine(dose: VaccineDose, today: string) {
  const offset = daysBetween(today, dose.dueOn);
  switch (dose.status) {
    case 'given':
      return `Given on ${dose.givenOn ? formatShortDate(dose.givenOn) : formatShortDate(dose.dueOn)}`;
    case 'due':
      return 'Due today';
    case 'overdue':
      return `Was due ${plural(-offset, 'day')} ago (${formatShortDate(dose.dueOn)})`;
    case 'upcoming':
      return offset === 1
        ? `Due tomorrow (${formatShortDate(dose.dueOn)})`
        : `Due in ${plural(offset, 'day')} (${formatDay(dose.dueOn, today)})`;
  }
}

const RAIL: Record<VaccineDose['status'], { ring: string; fill: string; text: string }> = {
  given: { ring: Colors.success, fill: Colors.success, text: Colors.onInk },
  due: { ring: Colors.warning, fill: Colors.warningSoft, text: Colors.warning },
  overdue: { ring: Colors.danger, fill: Colors.dangerSoft, text: Colors.danger },
  upcoming: { ring: Colors.border, fill: Colors.backgroundElement, text: Colors.textSecondary },
};

/**
 * Which day a dose was given: today, or (for an overdue dose) its due day. Resolves to null if
 * the member backs out.
 */
export function askGivenDay(
  name: string,
  dose: VaccineDose,
  today: string,
): Promise<string | null> {
  const title = `${name}, dose ${dose.number}`;
  if (Platform.OS === 'web') {
    return Promise.resolve(
      globalThis.confirm?.(`${title}\n\nMark this dose as given today?`) ? today : null,
    );
  }
  return new Promise((resolve) => {
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
      { text: 'Given today', onPress: () => resolve(today) },
    ];
    if (dose.status === 'overdue') {
      buttons.splice(1, 0, {
        text: `Given on ${formatShortDate(dose.dueOn)}`,
        onPress: () => resolve(dose.dueOn),
      });
    }
    Alert.alert(title, 'When was this dose given?', buttons, {
      cancelable: true,
      onDismiss: () => resolve(null),
    });
  });
}

type DoseTimelineProps = {
  vaccination: VaccinationRecord;
  /** Saves a mark; the timeline shows a spinner on that dose until it settles. */
  onMark: (dose: VaccineDose, given: boolean, givenOn?: string) => Promise<unknown>;
};

/** Every dose of a vaccine on a rail: what is done, what is due, and Mark given / Undo. */
export function DoseTimeline({ vaccination, onMark }: DoseTimelineProps) {
  const today = istToday();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextNumber = vaccination.doses.find((dose) => dose.status !== 'given')?.number;

  const run = async (dose: VaccineDose, given: boolean, givenOn?: string) => {
    setBusy(dose.number);
    setError(null);
    try {
      await onMark(dose, given, givenOn);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const markGiven = async (dose: VaccineDose) => {
    const day = await askGivenDay(vaccination.name, dose, today);
    if (day) await run(dose, true, day);
  };

  return (
    <View>
      {vaccination.doses.map((dose, index) => {
        const rail = RAIL[dose.status];
        const isLast = index === vaccination.doses.length - 1;
        const isNext = dose.number === nextNumber;
        return (
          <View key={dose.number} style={styles.row}>
            <View style={styles.rail}>
              <View style={[styles.dot, { borderColor: rail.ring, backgroundColor: rail.fill }]}>
                {dose.status === 'given' ? (
                  <Check size={14} color={Colors.onInk} strokeWidth={3} />
                ) : (
                  <ThemedText style={[styles.dotText, { color: rail.text }]}>
                    {dose.number}
                  </ThemedText>
                )}
              </View>
              {isLast ? null : (
                <View style={[styles.line, dose.status === 'given' && styles.lineDone]} />
              )}
            </View>

            <View style={[styles.body, !isLast && styles.bodySpaced]}>
              <View style={styles.flex}>
                <ThemedText type="smallBold">
                  Dose {dose.number}
                  {vaccination.totalDoses > 1 ? ` of ${vaccination.totalDoses}` : ''}
                </ThemedText>
                <ThemedText
                  type="caption"
                  themeColor={
                    dose.status === 'overdue'
                      ? 'danger'
                      : dose.status === 'due'
                        ? 'warning'
                        : dose.status === 'given'
                          ? 'success'
                          : 'textSecondary'
                  }>
                  {statusLine(dose, today)}
                </ThemedText>
              </View>

              {busy === dose.number ? (
                <ActivityIndicator color={Colors.textSecondary} />
              ) : dose.status === 'given' ? (
                <Pressable
                  onPress={() => run(dose, false)}
                  accessibilityRole="button"
                  accessibilityLabel={`Undo, dose ${dose.number} not given`}
                  hitSlop={8}
                  style={({ pressed }) => [styles.undo, pressed && styles.pressed]}>
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.bold}>
                    Undo
                  </ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => markGiven(dose)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark dose ${dose.number} given`}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.mark,
                    isNext && dose.status !== 'upcoming' ? styles.markPrimary : styles.markQuiet,
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="caption"
                    themeColor={isNext && dose.status !== 'upcoming' ? 'onInk' : 'text'}
                    style={styles.bold}>
                    Mark given
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
      {error ? (
        <ThemedText type="caption" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const DOT = 30;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two + 4,
  },
  rail: {
    width: DOT,
    alignItems: 'center',
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: {
    fontFamily: Fonts.bold,
    fontSize: 13,
    lineHeight: 16,
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: 2,
    backgroundColor: Colors.border,
  },
  lineDone: {
    backgroundColor: Colors.success,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: DOT,
  },
  bodySpaced: {
    paddingBottom: Spacing.three,
  },
  flex: {
    flex: 1,
  },
  mark: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  markPrimary: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  markQuiet: {
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
  },
  undo: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  bold: {
    fontFamily: Fonts.bold,
  },
  pressed: {
    opacity: 0.75,
  },
});
