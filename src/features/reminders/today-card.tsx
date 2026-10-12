import { useState } from 'react';

import { ErrorState } from '@/components/ui/empty-state';

import { dosesOn, toDateKey, type Dose } from './schedule';
import {
  MedicinesSkeleton,
  MedicinesTimelineCard,
  NoMedicinesCard,
  NothingDueCard,
} from './today-timeline';
import { useNow } from './use-now';
import { useReminders } from './use-reminders';

/** Today's doses on the Care tab. Tap a dose to tick it off; the full screen has the rest. */
export function TodayMedicinesCard() {
  const { reminders, error, refresh, markDose } = useReminders();
  const now = useNow();
  const today = toDateKey(now);
  const [markError, setMarkError] = useState<string | null>(null);

  if (!reminders) {
    return error ? (
      <ErrorState title="Couldn’t load your medicines" message={error} onRetry={refresh} />
    ) : (
      <MedicinesSkeleton />
    );
  }

  if (!reminders.length) return <NoMedicinesCard />;

  const doses = dosesOn(reminders, today);
  if (!doses.length) return <NothingDueCard />;

  const toggle = (dose: Dose) => {
    setMarkError(null);
    markDose(dose, dose.status === 'taken' ? null : 'taken').catch((e: unknown) =>
      setMarkError(e instanceof Error ? e.message : 'Could not save that. Try again.'),
    );
  };

  return (
    <MedicinesTimelineCard
      doses={doses}
      now={now}
      today={today}
      onToggle={toggle}
      error={markError}
      maxDoses={8}
    />
  );
}
