import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  CalendarCheck,
  Moon,
  Plus,
  Sun,
  Sunrise,
  Sunset,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { ProgressRing } from '@/components/ui/progress-ring';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton, SkeletonGroup, SkeletonList } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
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
import { NoMedicinesCard } from '@/features/reminders/today-timeline';
import { type DoseStatus, type MedicineReminder } from '@/features/reminders/types';
import { useNow } from '@/features/reminders/use-now';
import { useReminders } from '@/features/reminders/use-reminders';
import { WeekStrip, type DayMark } from '@/features/reminders/week-strip';

/** The icon and colour beside each part of the day. */
const PARTS: Record<string, { icon: LucideIcon; tone: Tone }> = {
  Morning: { icon: Sunrise, tone: 'warning' },
  Afternoon: { icon: Sun, tone: 'primary' },
  Evening: { icon: Sunset, tone: 'danger' },
  Night: { icon: Moon, tone: 'neutral' },
};

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

/** The week, the day's summary and its doses while the medicines load. */
function MedicinesSkeleton() {
  return (
    <SkeletonGroup label="Loading your medicines" style={styles.stack}>
      <Surface style={styles.skeletonWeek}>
        <Skeleton width={120} height={14} />
        <View style={styles.skeletonDays}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height={58} radius={Radius.lg} style={styles.flex} />
          ))}
        </View>
      </Surface>
      <Skeleton height={96} radius={Radius.xl} />
      <Skeleton width={110} height={18} />
      <SkeletonList rows={3} leading="tile" />
    </SkeletonGroup>
  );
}

/** Medicine reminders: the day's doses to mark, and every medicine with its schedule. */
export default function MedicinesScreen() {
  const { reminders, error, refresh, update, markDose } = useReminders();
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
    <Screen
      // Always back to the Care page, even when this screen was opened from a notification.
      onBack={() => router.dismissTo('/care')}
      backLabel="Care"
      barTitle="Medicines"
      barRight={
        reminders?.length ? (
          <Pressable
            onPress={add}
            accessibilityRole="button"
            accessibilityLabel="Add a medicine"
            hitSlop={4}
            style={({ pressed }) => [styles.addPill, pressed && styles.pressed]}>
            <Plus size={16} color={Colors.onInk} strokeWidth={2.6} />
            <ThemedText type="smallBold" themeColor="onInk">
              Add
            </ThemedText>
          </Pressable>
        ) : null
      }
      onRefresh={refresh}>
      <View style={styles.stack}>
        {!reminders ? (
          error ? (
            <ErrorState title="Couldn’t load your medicines" message={error} onRetry={refresh} />
          ) : (
            <MedicinesSkeleton />
          )
        ) : !reminders.length ? (
          <NoMedicinesCard />
        ) : (
          <>
            <NotificationBanner />

            {actionError ? (
              <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
                {actionError}
              </ThemedText>
            ) : null}

            <WeekStrip selected={selected} today={today} onSelect={setSelected} markFor={markFor} />

            {/* The chosen day at a glance, on a soft green wash. */}
            <View style={styles.summary}>
              <LinearGradient
                colors={[Colors.successSoft, Colors.backgroundElement]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <ProgressRing value={taken} total={doses.length} size={64} />
              <View style={styles.flex}>
                <ThemedText style={styles.summaryDay}>{formatDay(selected, today)}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {doses.length
                    ? `${taken} of ${doses.length} ${doses.length === 1 ? 'dose' : 'doses'} taken`
                    : 'No medicines on this day'}
                </ThemedText>
              </View>
              {next ? (
                <View style={styles.next}>
                  <ThemedText style={styles.nextLabel}>Next</ThemedText>
                  <ThemedText type="smallBold" themeColor="onInk">
                    {formatTime(next.time)}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            {groupByPartOfDay(doses).map((group) => {
              const part = PARTS[group.title] ?? PARTS.Morning!;
              return (
                <View key={group.title} style={styles.section}>
                  <View style={styles.partHeader}>
                    <IconTile icon={part.icon} tone={part.tone} size={32} />
                    <ThemedText style={styles.partTitle} accessibilityRole="header">
                      {group.title}
                    </ThemedText>
                    <ThemedText type="caption" themeColor="textMuted">
                      {group.doses.length} {group.doses.length === 1 ? 'dose' : 'doses'}
                    </ThemedText>
                  </View>
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
              );
            })}

            {!doses.length ? (
              <EmptyState
                icon={CalendarCheck}
                tone="success"
                title={`Nothing to take ${selected === today ? 'today' : 'on this day'}`}
                body="Pick another day in the week above to see its doses."
              />
            ) : null}

            <View style={styles.section}>
              <SectionHeader title="Your medicines" meta={`${reminders.length}`} />
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.three + 2,
  },
  flex: {
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
    boxShadow: Shadows.glow,
  },
  pressed: {
    opacity: 0.75,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 2,
    padding: Spacing.three,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundElement,
    overflow: 'hidden',
  },
  summaryDay: {
    fontFamily: Fonts.display,
    fontSize: 20,
    lineHeight: 25,
  },
  next: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.ink,
  },
  nextLabel: {
    fontFamily: Fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    color: Colors.onInkMuted,
  },
  section: {
    gap: Spacing.two + 2,
  },
  partHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  partTitle: {
    flex: 1,
    fontFamily: Fonts.display,
    fontSize: 17,
    lineHeight: 22,
  },
  list: {
    paddingVertical: 0,
  },
  skeletonWeek: {
    gap: Spacing.three - 4,
  },
  skeletonDays: {
    flexDirection: 'row',
    gap: 6,
  },
});
