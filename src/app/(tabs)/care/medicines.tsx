import { router } from 'expo-router';
import { AlertCircle, Plus } from 'lucide-react-native';
import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/empty-state';
import { Divided, ListCard } from '@/components/ui/list';
import { Section } from '@/components/ui/section';
import { Skeleton, SkeletonCircle, SkeletonGroup, SkeletonList } from '@/components/ui/skeleton';
import { HeaderIconButton } from '@/components/ui/stack-header';
import { Colors, Fonts, Radius, Shadows, Spacing } from '@/constants/theme';
import { DoseItem, doseState, type DoseState } from '@/features/reminders/dose-item';
import { DoseRing, LEAD, MedicineDish } from '@/features/reminders/dose-ui';
import { MedicineRow } from '@/features/reminders/medicine-row';
import { NotificationBanner } from '@/features/reminders/notification-banner';
import {
  dosesOn,
  formatDay,
  hasEnded,
  partOfDay,
  toDateKey,
  type Dose,
} from '@/features/reminders/schedule';
import { type DoseStatus, type MedicineReminder } from '@/features/reminders/types';
import { useNow } from '@/features/reminders/use-now';
import { useReminders } from '@/features/reminders/use-reminders';
import { WeekStrip, type DayMark } from '@/features/reminders/week-strip';

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

/** How the chosen day stands, in a few words under its name. The ring shows the count. */
function dayStatus(states: DoseState[], isToday: boolean, isFuture: boolean) {
  const open = states.filter((state) => state !== 'taken' && state !== 'skipped').length;
  if (isFuture) return 'Coming up';
  if (!open) return states.every((state) => state === 'taken') ? 'Every dose taken' : 'All marked';
  if (!isToday) return `${open} not marked`;
  return `${open} ${open === 1 ? 'dose' : 'doses'} left`;
}

/** The week, the day's doses and the medicine list while they load. */
function MedicinesSkeleton() {
  return (
    <SkeletonGroup label="Loading your medicines" style={styles.skeleton}>
      <View style={styles.card}>
        <Skeleton width={130} height={16} />
        <View style={styles.skeletonDays}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} height={56} radius={Radius.lg} style={styles.flex} />
          ))}
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.dayHeader}>
          <SkeletonCircle size={LEAD} />
          <View style={[styles.flex, styles.skeletonText]}>
            <Skeleton width="30%" height={15} />
            <Skeleton width="45%" height={11} />
          </View>
        </View>
        {[0, 1].map((i) => (
          <View key={i} style={styles.skeletonRow}>
            <SkeletonCircle size={LEAD} />
            <View style={[styles.flex, styles.skeletonText]}>
              <Skeleton width={i ? '45%' : '55%'} height={13} />
              <Skeleton width={i ? '62%' : '70%'} height={10} />
            </View>
            <SkeletonCircle size={LEAD} />
          </View>
        ))}
      </View>
      <Skeleton width={140} height={20} />
      <SkeletonList rows={3} leading="tile" trailing={false} />
    </SkeletonGroup>
  );
}

/** Before the first medicine: what reminders do, and the one way to start. */
function NoMedicinesYet({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={[styles.card, styles.invite]}>
      <View style={styles.inviteDish}>
        <MedicineDish size={72} />
      </View>
      <View style={styles.inviteText}>
        <ThemedText style={styles.inviteTitle} accessibilityRole="header">
          Never miss a dose
        </ThemedText>
        <ThemedText style={styles.inviteBody}>
          Add your medicines and we’ll remind you at the right time. Tick each dose off as you
          take it.
        </ThemedText>
      </View>
      <Button label="Add medicine" icon={Plus} onPress={onAdd} />
    </View>
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
  const states = doses.map((dose) => doseState(dose, now, today));
  const taken = states.filter((state) => state === 'taken').length;
  const day = formatDay(selected, today);
  const status = dayStatus(states, selected === today, selected > today);

  return (
    <Screen
      // Always back to the Care page, even when this screen was opened from a notification.
      onBack={() => router.dismissTo('/care')}
      backLabel="Care"
      barTitle="Medicines"
      barRight={
        reminders?.length ? (
          <HeaderIconButton
            icon={<Plus size={18} color={Colors.primaryDeep} strokeWidth={2.5} />}
            label="Add a medicine"
            text="Add"
            onPress={add}
          />
        ) : null
      }
      onRefresh={refresh}>
      {!reminders ? (
        error ? (
          <ErrorState title="Couldn’t load your medicines" message={error} onRetry={refresh} />
        ) : (
          <MedicinesSkeleton />
        )
      ) : !reminders.length ? (
        <NoMedicinesYet onAdd={add} />
      ) : (
        <>
          <NotificationBanner />

          <Section index={0}>
            <WeekStrip selected={selected} today={today} onSelect={setSelected} markFor={markFor} />
          </Section>

          <Section index={1}>
            {/* The chosen day on one card, like Home's Today: how it is going, then its doses. */}
            <View style={styles.card}>
              {doses.length ? (
                <View
                  style={styles.dayHeader}
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel={`${day}. ${taken} of ${doses.length} ${doses.length === 1 ? 'dose' : 'doses'} taken. ${status}.`}>
                  <DoseRing taken={taken} total={doses.length} />
                  <View style={styles.flex}>
                    <ThemedText style={styles.dayTitle} numberOfLines={1}>
                      {day}
                    </ThemedText>
                    <ThemedText style={styles.daySubtitle} numberOfLines={1}>
                      {status}
                    </ThemedText>
                  </View>
                </View>
              ) : (
                <View style={styles.dayHeader}>
                  <MedicineDish faded />
                  <View style={styles.flex}>
                    <ThemedText style={styles.dayTitle} accessibilityRole="header">
                      {`Nothing to take ${selected === today ? 'today' : 'on this day'}`}
                    </ThemedText>
                    <ThemedText style={styles.daySubtitle}>
                      Pick another day in the week above to see its doses.
                    </ThemedText>
                  </View>
                </View>
              )}

              {groupByPartOfDay(doses).map((group) => (
                <Fragment key={group.title}>
                  <View style={styles.rule} />
                  <ThemedText style={styles.part} accessibilityRole="header">
                    {group.title}
                  </ThemedText>
                  <Divided inset={LEAD}>
                    {group.doses.map((dose) => (
                      <DoseItem
                        key={`${dose.reminder.id}-${dose.time}`}
                        dose={dose}
                        state={doseState(dose, now, today)}
                        onMark={(next) => mark(dose, next)}
                      />
                    ))}
                  </Divided>
                </Fragment>
              ))}

              {actionError ? (
                <View style={styles.error} accessibilityLiveRegion="polite">
                  <AlertCircle size={15} color={Colors.high} strokeWidth={2.4} />
                  <ThemedText style={styles.errorText}>{actionError}</ThemedText>
                </View>
              ) : null}
            </View>
          </Section>

          <Section title="Your medicines" meta={`${reminders.length}`} index={2}>
            <ListCard>
              {sortForList(reminders, today).map((reminder) => (
                <MedicineRow
                  key={reminder.id}
                  reminder={reminder}
                  now={now}
                  today={today}
                  onPress={() =>
                    router.push({ pathname: '/care/medicine/[id]', params: { id: reminder.id } })
                  }
                  onToggleActive={(active) => toggleActive(reminder, active)}
                />
              ))}
            </ListCard>
          </Section>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  card: {
    paddingHorizontal: Spacing.three - 2,
    paddingVertical: Spacing.three - 4,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.hairline,
    backgroundColor: Colors.backgroundElement,
    boxShadow: Shadows.soft,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  dayTitle: {
    fontFamily: Fonts.displaySemibold,
    fontSize: 16.5,
    lineHeight: 21,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  daySubtitle: {
    marginTop: 1,
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.textSoft,
  },
  // Runs edge to edge between the day's parts; the lines inside a part start where the words do.
  rule: {
    height: StyleSheet.hairlineWidth,
    marginTop: Spacing.two + 2,
    marginHorizontal: -(Spacing.three - 2),
    backgroundColor: Colors.hairline,
  },
  part: {
    marginTop: Spacing.two + 2,
    marginBottom: -2,
    fontFamily: Fonts.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.textFaint,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'center',
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
  invite: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.four + 4,
    paddingBottom: Spacing.four - 4,
    paddingHorizontal: Spacing.four - 4,
  },
  inviteDish: {
    borderRadius: 36,
    boxShadow: Shadows.dish,
  },
  inviteText: {
    gap: 4,
    maxWidth: 300,
  },
  inviteTitle: {
    textAlign: 'center',
    fontFamily: Fonts.displaySemibold,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: -0.3,
    color: Colors.text,
  },
  inviteBody: {
    textAlign: 'center',
    fontFamily: Fonts.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSoft,
  },
  skeleton: {
    gap: Spacing.four - 4,
  },
  skeletonDays: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.three - 4,
  },
  skeletonText: {
    gap: 8,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    marginTop: Spacing.three,
  },
});
