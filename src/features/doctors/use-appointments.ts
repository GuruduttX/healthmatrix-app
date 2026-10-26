import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { isMissedConsult } from '@/features/consult-call/consult-call-api';
import { useNow } from '@/features/reminders/use-now';
import { api } from '@/services/api';

import { type Appointment, type Specialty } from './types';

// One copy of the member's upcoming consults, shared by the Care tab and the booking screen.
let snapshot: { memberId: string; appointments: Appointment[] } | null = null;
const listeners = new Set<() => void>();
let loading: { memberId: string; promise: Promise<void> } | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(memberId: string, appointments: Appointment[]) {
  const sorted = [...appointments].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  snapshot = { memberId, appointments: sorted };
  listeners.forEach((listener) => listener());
}

const listFor = (memberId: string) =>
  snapshot?.memberId === memberId ? snapshot.appointments : [];

/** Fetches the list again. Calls made while one is in flight share it. */
export function refreshAppointments(memberId: string) {
  if (loading?.memberId === memberId) return loading.promise;
  const promise = api<{ appointments: Appointment[] }>('/consults')
    .then(({ appointments }) => publish(memberId, appointments))
    .finally(() => {
      loading = null;
    });
  loading = { memberId, promise };
  return promise;
}

export type BookingRequest = {
  doctorId: string;
  specialty: Specialty;
  scheduledAt: string;
  reason?: string;
};

/**
 * The signed-in member's upcoming consults. `appointments` is null until the first load. A booked
 * consult nobody started within 10 minutes of its time drops off on the minute; the server then
 * lists it with the past ones.
 */
export function useAppointments() {
  const memberId = useAuth().member?.id;
  const now = useNow();
  const current = useSyncExternalStore(subscribe, () => snapshot);
  const loaded = current && current.memberId === memberId ? current.appointments : null;
  const appointments = loaded && loaded.filter((appointment) => !isMissedConsult(appointment, now));
  const [error, setError] = useState<string | null>(null);

  /** Loads the list again, e.g. on pull-to-refresh. */
  const refresh = useCallback(async () => {
    if (!memberId) return;
    await refreshAppointments(memberId).then(
      () => setError(null),
      (e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your appointments'),
    );
  }, [memberId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const book = async (request: BookingRequest) => {
    if (!memberId) throw new Error('Please sign in');
    const { appointment } = await api<{ appointment: Appointment }>('/consults', {
      method: 'POST',
      body: request,
    });
    publish(memberId, [...listFor(memberId), appointment]);
    return appointment;
  };

  const cancel = async (id: string) => {
    if (!memberId) throw new Error('Please sign in');
    await api<null>(`/consults/${id}`, { method: 'PATCH', body: { status: 'cancelled' } });
    publish(
      memberId,
      listFor(memberId).filter((appointment) => appointment.id !== id),
    );
  };

  // `withMissed` keeps the ones just missed, for a screen already showing one (the call screen).
  return { appointments, withMissed: loaded, error, refresh, book, cancel };
}
