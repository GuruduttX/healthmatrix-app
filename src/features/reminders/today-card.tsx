import { router } from 'expo-router';
import { Check, ChevronRight, Pill, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { ProgressRing } from '@/components/ui/progress-ring';
import { Surface } from '@/components/ui/surface';
import { Tag } from '@/components/ui/tag';
import { Colors, Spacing } from '@/constants/theme';

import { doseState } from './dose-item';
import { describeDose, dosesOn, formatTime, toDateKey } from './schedule';
import { useNow } from './use-now';
import { useReminders } from './use-reminders';

/** Today's doses on the Care tab. Tap a dose to tick it off; the full screen has the rest. */
export function TodayMedicinesCard() {
  const { reminders, error, markDose } = useReminders();
  const now = useNow();
  const today = toDateKey(now);
  const [markError, setMarkError] = useState<string | null>(null);

  if (!reminders) {
    return (
      <Surface style={styles.loading}>
        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : (
          <ActivityIndicator color={Colors.textSecondary} />
        )}
      </Surface>
    );
  }

  if (!reminders.length) {
    return (
      <Surface style={styles.empty}>
        <View style={styles.header}>
          <IconTile icon={Pill} tone="primary" size={44} />
          <View style={styles.flex}>
            <ThemedText type="bodyBold">Never miss a dose</ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              Add your medicines and we’ll remind you at the right time.
            </ThemedText>
          </View>
        </View>
        <Button label="Add a medicine" icon={Plus} onPress={() => router.push('/care/medicine/new')} />
      </Surface>
    );
  }

  const doses = dosesOn(reminders, today);
  const taken = doses.filter((dose) => dose.status === 'taken').length;
  const unmarked = doses.filter(
    (dose) => !dose.status && ['due', 'missed'].includes(doseState(dose, now, today)),
  ).length;

  const toggle = (index: number) => {
    const dose = doses[index];
    if (!dose) return;
    setMarkError(null);
    markDose(dose, dose.status === 'taken' ? null : 'taken').catch((e: unknown) =>
      setMarkError(e instanceof Error ? e.message : 'Could not save that. Try again.'),
    );
  };

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <ProgressRing value={taken} total={doses.length} />
        <View style={styles.flex}>
          <ThemedText type="bodyBold">Your medicines today</ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            {doses.length ? `${taken} of ${doses.length} taken` : 'Nothing due today'}
          </ThemedText>
        </View>
        {unmarked > 0 ? (
          <Tag label={`${unmarked} to take`} tone="warning" />
        ) : doses.length && taken === doses.length ? (
          <Tag label="All taken" tone="success" />
        ) : null}
      </View>

      {doses.map((dose, index) => {
        const done = dose.status === 'taken';
        const detail = describeDose(dose.reminder);
        return (
          <Pressable
            key={`${dose.reminder.id}-${dose.time}`}
            onPress={() => toggle(index)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={`${dose.reminder.name}, ${formatTime(dose.time)}`}
            style={({ pressed }) => [styles.dose, pressed && styles.pressed]}>
            <View style={[styles.check, done && styles.checkDone]}>
              {done ? <Check size={14} color={Colors.onInk} strokeWidth={3} /> : null}
            </View>
            <View style={styles.flex}>
              <ThemedText
                type="small"
                numberOfLines={1}
                themeColor={dose.status ? 'textSecondary' : 'text'}
                style={dose.status === 'skipped' && styles.struck}>
                {dose.reminder.name}
              </ThemedText>
              {detail ? (
                <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
                  {detail}
                </ThemedText>
              ) : null}
            </View>
            <ThemedText
              type="caption"
              themeColor={doseState(dose, now, today) === 'missed' ? 'warning' : 'textMuted'}>
              {formatTime(dose.time)}
            </ThemedText>
          </Pressable>
        );
      })}

      {markError ? (
        <ThemedText type="caption" themeColor="danger">
          {markError}
        </ThemedText>
      ) : null}

      <Pressable
        onPress={() => router.push('/care/medicines')}
        accessibilityRole="button"
        style={({ pressed }) => [styles.footer, pressed && styles.pressed]}>
        <ThemedText type="smallBold" themeColor="primary">
          All medicines and reminders
        </ThemedText>
        <ChevronRight size={16} color={Colors.primary} strokeWidth={2.4} />
      </Pressable>
    </Surface>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
  },
  empty: {
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingBottom: Spacing.two,
  },
  dose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  checkDone: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  struck: {
    textDecorationLine: 'line-through',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: Spacing.two + 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
