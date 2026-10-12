import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/ui/empty-state';
import { Spacing } from '@/constants/theme';
import { useAppointments } from '@/features/doctors/use-appointments';
import { dosesOn, toDateKey, type Dose } from '@/features/reminders/schedule';
import {
  MedicinesSkeleton,
  MedicinesTimelineCard,
  NoMedicinesCard,
  NothingDueCard,
} from '@/features/reminders/today-timeline';
import { useNow } from '@/features/reminders/use-now';
import { useReminders } from '@/features/reminders/use-reminders';
import { useVaccinations } from '@/features/vaccines/use-vaccinations';

import { ConsultCard } from './consult-card';

/**
 * "Today" on Home: the next consult, then today's doses on a timeline (tap to tick one off) and
 * any vaccine dose that is due. Reads the same stores as the Care tab.
 */
export function TodayPlan() {
  const { appointments } = useAppointments();
  const { reminders, error, refresh, markDose } = useReminders();
  const { vaccinations } = useVaccinations();
  const now = useNow();
  const [markError, setMarkError] = useState<string | null>(null);

  const today = toDateKey(now);
  const next = appointments?.find(
    (appointment) => appointment.status === 'scheduled' || appointment.status === 'in_progress',
  );
  const doses = reminders ? dosesOn(reminders, today) : [];
  const vaccinesDue = (vaccinations ?? []).flatMap((vaccination) => {
    const dose = vaccination.doses.find((d) => d.status !== 'given');
    return dose && (dose.status === 'due' || dose.status === 'overdue')
      ? [{ vaccination, dose }]
      : [];
  });

  const toggle = (dose: Dose) => {
    setMarkError(null);
    markDose(dose, dose.status === 'taken' ? null : 'taken').catch((e: unknown) =>
      setMarkError(e instanceof Error ? e.message : 'Could not save that. Try again.'),
    );
  };

  let plan: ReactNode;
  if (!reminders) {
    plan = error ? (
      <ErrorState title="Couldn’t load your medicines" message={error} onRetry={refresh} />
    ) : (
      <MedicinesSkeleton />
    );
  } else if (!doses.length && !vaccinesDue.length) {
    plan = reminders.length ? <NothingDueCard includesVaccines /> : <NoMedicinesCard />;
  } else {
    plan = (
      <MedicinesTimelineCard
        doses={doses}
        vaccinesDue={vaccinesDue}
        now={now}
        today={today}
        onToggle={toggle}
        error={markError}
      />
    );
  }

  return (
    <View style={styles.stack}>
      {next ? <ConsultCard appointment={next} now={now} /> : null}
      {plan}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: Spacing.three - 4,
  },
});
