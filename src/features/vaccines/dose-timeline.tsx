import { AlertCircle, Check, Clock, RotateCcw, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { LIST_LEAD } from '@/components/ui/list';
import { Colors, Fonts, Glass, Radius, Spacing } from '@/constants/theme';
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

/**
 * Each status's dot on the rail and the colour and icon of its line: the reading flags (good,
 * watch, high), so a dose is never told apart by colour alone.
 */
const RAIL: Record<
  VaccineDose['status'],
  { ring: string; fill: string; text: string; icon?: LucideIcon }
> = {
  given: { ring: Colors.good, fill: Colors.good, text: Colors.good, icon: Check },
  due: { ring: Colors.watch, fill: Colors.watchSoft, text: Colors.watch, icon: Clock },
  overdue: { ring: Colors.high, fill: Colors.highSoft, text: Colors.high, icon: AlertCircle },
  upcoming: { ring: Colors.border, fill: Glass.fillSoft, text: Colors.textSoft },
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
  /**
   * Saves a mark; the timeline shows a spinner on that dose until it settles. Leave it out for a
   * read-only timeline, e.g. a family member's vaccine.
   */
  onMark?: (dose: VaccineDose, given: boolean, givenOn?: string) => Promise<unknown>;
};

/** Every dose of a vaccine on a rail: what is done, what is due, and Mark given / Undo. */
export function DoseTimeline({ vaccination, onMark }: DoseTimelineProps) {
  const today = istToday();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nextNumber = vaccination.doses.find((dose) => dose.status !== 'given')?.number;

  const run = async (dose: VaccineDose, given: boolean, givenOn?: string) => {
    if (!onMark) return;
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
        const StatusIcon = rail.icon;
        const isLast = index === vaccination.doses.length - 1;
        // The dose to get now: its button is the solid one.
        const solid = dose.number === nextNumber && dose.status !== 'upcoming';
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
                <ThemedText style={styles.title} numberOfLines={1}>
                  Dose {dose.number}
                  {vaccination.totalDoses > 1 ? ` of ${vaccination.totalDoses}` : ''}
                </ThemedText>
                <View style={styles.status}>
                  {StatusIcon ? (
                    <StatusIcon
                      size={12}
                      color={rail.text}
                      strokeWidth={2.6}
                      style={styles.statusIcon}
                    />
                  ) : null}
                  <ThemedText
                    style={[
                      styles.statusText,
                      { color: rail.text },
                      dose.status === 'upcoming' && styles.statusQuiet,
                    ]}
                    numberOfLines={2}>
                    {statusLine(dose, today)}
                  </ThemedText>
                </View>
              </View>

              {!onMark ? null : busy === dose.number ? (
                <ActivityIndicator color={Colors.textFaint} />
              ) : dose.status === 'given' ? (
                <Pressable
                  onPress={() => run(dose, false)}
                  accessibilityRole="button"
                  accessibilityLabel={`Undo, dose ${dose.number} not given`}
                  hitSlop={8}
                  style={({ pressed }) => [styles.undo, pressed && styles.pressed]}>
                  <RotateCcw size={13} color={Colors.primaryDeep} strokeWidth={2.6} />
                  <ThemedText style={styles.undoText}>Undo</ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => markGiven(dose)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mark dose ${dose.number} given`}
                  hitSlop={6}
                  style={({ pressed }) => [
                    solid ? [styles.mark, styles.markSolid] : styles.tick,
                    pressed && (solid ? styles.markSolidPressed : styles.tickPressed),
                  ]}>
                  <Check
                    size={solid ? 14 : 16}
                    color={solid ? Colors.onInk : Colors.primaryDeep}
                    strokeWidth={solid ? 2.8 : 3}
                  />
                  {/* Words only on the dose to get now; the rest are a round tick, as on Home. */}
                  {solid ? <ThemedText style={styles.markText}>Mark given</ThemedText> : null}
                </Pressable>
              )}
            </View>
          </View>
        );
      })}
      {error ? (
        <View style={styles.error} accessibilityLiveRegion="polite">
          <AlertCircle size={15} color={Colors.high} strokeWidth={2.4} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const DOT = 30;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
  },
  // As wide as a list row's lead, so the words line up with the rows around the timeline.
  rail: {
    width: LIST_LEAD,
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
    fontVariant: ['tabular-nums'],
  },
  line: {
    flex: 1,
    width: 2,
    marginVertical: 3,
    borderRadius: 1,
    backgroundColor: Colors.border,
  },
  lineDone: {
    backgroundColor: Colors.good,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: DOT + 4,
  },
  bodySpaced: {
    paddingBottom: Spacing.three + 2,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: Fonts.bold,
    fontSize: 14.5,
    lineHeight: 19,
    color: Colors.text,
  },
  // Top-aligned, so the icon stays on the first line when a long status wraps.
  status: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 1,
  },
  statusIcon: {
    marginTop: 2.5,
  },
  statusText: {
    flexShrink: 1,
    fontFamily: Fonts.semibold,
    fontSize: 12.5,
    lineHeight: 17,
  },
  statusQuiet: {
    fontFamily: Fonts.medium,
  },
  // As on Home's Today card: a solid pill for the dose to get now, a round tick for the rest.
  mark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
  },
  markSolid: {
    backgroundColor: Colors.primaryDeep,
  },
  markSolidPressed: {
    backgroundColor: Colors.primaryInk,
    transform: [{ scale: 0.97 }],
  },
  // Like a checkbox waiting for a tick: a round of glass with a peach ring.
  tick: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    backgroundColor: Glass.fillSoft,
    boxShadow: Glass.glowSmall,
  },
  tickPressed: {
    backgroundColor: Colors.primaryTintStrong,
    transform: [{ scale: 0.97 }],
  },
  markText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.onInk,
  },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  undoText: {
    fontFamily: Fonts.bold,
    fontSize: 13.5,
    lineHeight: 18,
    color: Colors.primaryDeep,
  },
  pressed: {
    opacity: 0.6,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: Spacing.two,
  },
  errorText: {
    flex: 1,
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.high,
  },
});
