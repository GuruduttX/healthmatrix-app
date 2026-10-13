import { useEffect, useState } from 'react';

import { useAppointments } from '@/features/doctors/use-appointments';
import { dosesOn, toDateKey, type Dose } from '@/features/reminders/schedule';
import { type DoseStatus } from '@/features/reminders/types';
import { useNow } from '@/features/reminders/use-now';
import { useReminders } from '@/features/reminders/use-reminders';
import { useVaccinations } from '@/features/vaccines/use-vaccinations';

import { TodayHero, TodayHeroEmpty, TodayHeroError, TodayHeroSkeleton } from './today-hero';
import { summarizeToday } from './today-summary';

/** How long "marked taken · Undo" stays on the card. */
const UNDO_MS = 6000;

/**
 * "Today" at the top of Home: the next consult, today's doses (Take ticks one off, with Undo)
 * and any vaccine that is due. Reads the same stores as the Care tab.
 */
export function TodayPlan() {
  const { appointments } = useAppointments();
  const { reminders, error, refresh, markDose } = useReminders();
  const { vaccinations } = useVaccinations();
  const now = useNow();
  const [markError, setMarkError] = useState<string | null>(null);
  const [justTaken, setJustTaken] = useState<Dose | null>(null);

  useEffect(() => {
    if (!justTaken) return;
    const timer = setTimeout(() => setJustTaken(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [justTaken]);

  const today = toDateKey(now);
  const consult = appointments?.find(
    (appointment) => appointment.status === 'scheduled' || appointment.status === 'in_progress',
  );
  const vaccinesDue = (vaccinations ?? []).flatMap((vaccination) => {
    const dose = vaccination.doses.find((d) => d.status !== 'given');
    return dose && (dose.status === 'due' || dose.status === 'overdue')
      ? [{ vaccination, dose }]
      : [];
  });

  const mark = (dose: Dose, status: DoseStatus | null) => {
    setMarkError(null);
    markDose(dose, status).catch((e: unknown) =>
      setMarkError(e instanceof Error ? e.message : 'Could not save that. Try again.'),
    );
  };

  if (!reminders) {
    return error ? <TodayHeroError message={error} onRetry={refresh} /> : <TodayHeroSkeleton />;
  }

  const summary = summarizeToday({
    consult,
    doses: dosesOn(reminders, today),
    vaccinesDue,
    now,
    today,
  });

  if (!reminders.length && !vaccinesDue.length) {
    const consultItem = summary.next.find((item) => item.kind === 'consult');
    return (
      <TodayHeroEmpty
        consult={consultItem?.kind === 'consult' ? consultItem : undefined}
        now={now}
      />
    );
  }

  return (
    <TodayHero
      summary={summary}
      now={now}
      onTake={(dose) => {
        mark(dose, 'taken');
        setJustTaken(dose);
      }}
      justTaken={
        justTaken
          ? {
              dose: justTaken,
              onUndo: () => {
                mark(justTaken, null);
                setJustTaken(null);
              },
            }
          : null
      }
      error={markError}
    />
  );
}
