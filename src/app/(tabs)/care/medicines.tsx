import { router } from 'expo-router';
import { CalendarCheck, ChevronLeft, Pill, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { ProgressRing } from '@/components/ui/progress-ring';
import { SectionHeader } from '@/components/ui/section-header';
import { Surface } from '@/components/ui/surface';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { DoseItem, doseState } from '@/features/reminders/dose-item';
import { MedicineRow } from '@/features/reminders/medicine-row';
import { NotificationBanner } from '@/features/reminders/notification-banner';
import {
  dosesOn,
  formatDay,
  formatTime,
  hasEnded,
  partOfDay,
  toDateKey,
  type Dose,
} from '@/features/reminders/schedule';
import { type DoseStatus, type MedicineReminder } from '@/features/reminders/types';
import { useNow } from '@/features/reminders/use-now';
import { useReminders } from '@/features/reminders/use-reminders';
import { WeekStrip, type DayMark } from '@/features/reminders/week-strip';
import { useRefreshControl } from '@/hooks/use-refresh-control';
import { useTabBarClearance } from '@/hooks/use-tab-bar-clearance';

/** Running medicines first, then paused, then finished courses. */
function sortForList(reminders: MedicineReminder[], today: string) {
  const rank = (reminder: MedicineReminder) =>
    hasEnded(reminder, today) ? 2 : reminder.isActive ? 0 : 1;
  return [...reminders].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** Doses in order, split into morning, afternoon, evening and night. */
function groupByPartOfDay(doses: Dose[]) {
  const groups: { title: string; doses: Dose[] }[] = [];
  for (const dose of doses) {
    const title = partOfDay(dose.time);
    const last = groups[groups.length - 1];
    if (last?.title === title) last.doses.push(dose);
    else groups.push({ title, doses: [dose] });
  }
  return groups;
}

/** Medicine reminders: the day's doses to mark, and every medicine with its schedule. */
export default function MedicinesScreen() {
  const { reminders, error, refresh, update, markDose } = useReminders();
  const clearance = useTabBarClearance();
  const refreshControl = useRefreshControl(refresh);
  const now = useNow();
  const today = toDateKey(now);
  const [selected, setSelected] = useState(today);
  const [actionError, setActionError] = useState<string | null>(null);

  const add = () => router.push('/care/medicine/new');

  const mark = (dose: Dose, status: DoseStatus | null) => {
    setActionError(null);
    markDose(dose, status).catch((e: unknown) =>
      setActionError(e instanceof Error ? e.message : 'Could not save that. Try again.'),
    );
  };

  const toggleActive = (reminder: MedicineReminder, active: boolean) => {
    setActionError(null);
    update(reminder.id, { isActive: active }).catch((e: unknown) =>
      setActionError(e instanceof Error ? e.message : 'Could not save that. Try again.'),
    );
  };

  const markFor = (date: string): DayMark | undefined => {
    if (!reminders || date > today) return undefined;
    const day = dosesOn(reminders, date);
    if (!day.length) return undefined;
    if (day.every((dose) => dose.status)) return 'done';
    return day.some((dose) => doseState(dose, now, today) === 'missed') ? 'missed' : undefined;
  };

  const doses = reminders ? dosesOn(reminders, selected) : [];
  const taken = doses.filter((dose) => dose.status === 'taken').length;
  const next =
    selected === today ? doses.find((dose) => !dose.status && dose.at > now) : undefined;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <Pressable
            // Always back to the Care page, even when this screen was opened from a notification.
            onPress={() => router.dismissTo('/care')}
            accessibilityRole="button"
            accessibilityLabel="Back to Care"
            hitSlop={8}
            style={({ pressed }) => [styles.round, pressed && styles.pressed]}>
            <ChevronLeft size={20} color={Colors.text} strokeWidth={2.2} />
          </Pressable>
          <ThemedText type="subtitle" style={styles.title}>
            Medicines
          </ThemedText>
          {reminders?.length ? (
            <Pressable
              onPress={add}
              accessibilityRole="button"
              accessibilityLabel="Add a medicine"
              style={({ pressed }) => [styles.addPill, pressed && styles.pressed]}>
              <Plus size={16} color={Colors.onInk} strokeWidth={2.6} />
              <ThemedText type="smallBold" themeColor="onInk">
                Add
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          contentContainerStyle={[styles.content, { paddingBottom: clearance + Spacing.three }]}>
          {!reminders ? (
            <View style={styles.loading}>
              {error ? (
                <ThemedText type="small" themeColor="danger">
                  {error}
                </ThemedText>
              ) : (
                <ActivityIndicator color={Colors.textSecondary} />
              )}
            </View>
          ) : !reminders.length ? (
            <EmptyState onAdd={add} />
          ) : (
            <>
              <NotificationBanner />

              {actionError ? (
                <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                  {actionError}
                </ThemedText>
              ) : null}

              <WeekStrip selected={selected} today={today} onSelect={setSelected} markFor={markFor} />

              <Surface style={styles.summary}>
                <ProgressRing value={taken} total={doses.length} />
                <View style={styles.flex}>
                  <ThemedText type="bodyBold">{formatDay(selected, today)}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {doses.length
                      ? `${taken} of ${doses.length} ${doses.length === 1 ? 'dose' : 'doses'} taken`
                      : 'No medicines on this day'}
                  </ThemedText>
                </View>
                {next ? (
                  <View style={styles.next}>
                    <ThemedText type="caption" themeColor="textSecondary">
                      Next
                    </ThemedText>
                    <ThemedText type="smallBold" themeColor="primary">
                      {formatTime(next.time)}
                    </ThemedText>
                  </View>
                ) : null}
              </Surface>

              {groupByPartOfDay(doses).map((group) => (
                <View key={group.title} style={styles.section}>
                  <SectionHeader title={group.title} />
                  <Surface style={styles.list}>
                    {group.doses.map((dose, index) => (
                      <DoseItem
                        key={`${dose.reminder.id}-${dose.time}`}
                        dose={dose}
                        state={doseState(dose, now, today)}
                        onMark={(status) => mark(dose, status)}
                        divider={index > 0}
                      />
                    ))}
                  </Surface>
                </View>
              ))}

              {!doses.length ? (
                <Surface style={styles.dayEmpty}>
                  <CalendarCheck size={22} color={Colors.textMuted} strokeWidth={2} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Nothing to take {selected === today ? 'today' : 'on this day'}.
                  </ThemedText>
                </Surface>
              ) : null}

              <View style={styles.section}>
                <SectionHeader title={`Your medicines (${reminders.length})`} />
                <Surface style={styles.list}>
                  {sortForList(reminders, today).map((reminder, index) => (
                    <MedicineRow
                      key={reminder.id}
                      reminder={reminder}
                      now={now}
                      today={today}
                      divider={index > 0}
                      onPress={() =>
                        router.push({ pathname: '/care/medicine/[id]', params: { id: reminder.id } })
                      }
                      onToggleActive={(active) => toggleActive(reminder, active)}
                    />
                  ))}
                </Surface>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Surface style={styles.empty}>
      <IconTile icon={Pill} tone="primary" size={64} />
      <ThemedText type="subtitle" style={styles.center}>
        Never miss a dose
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        Add each medicine with its times and how often to take it. Your phone will remind you, and
        you can tick off every dose.
      </ThemedText>
      <View style={styles.emptyButton}>
        <Button label="Add a medicine" icon={Plus} onPress={onAdd} />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    flex: 1,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  pressed: {
    opacity: 0.75,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.three,
    paddingTop: Spacing.one,
  },
  loading: {
    paddingVertical: Spacing.six,
    alignItems: 'center',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  next: {
    alignItems: 'flex-end',
  },
  section: {
    gap: Spacing.two,
  },
  list: {
    paddingVertical: 0,
  },
  dayEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 4,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two + 4,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
});
