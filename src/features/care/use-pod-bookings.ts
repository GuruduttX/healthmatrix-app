import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/services/api';

import { type PodBooking } from './types';

// One copy of the member's pod bookings, shared by the Care tab and the pod finder.
let snapshot: { memberId: string; bookings: PodBooking[] } | null = null;
const listeners = new Set<() => void>();
let loading: { memberId: string; promise: Promise<void> } | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Fetches the bookings again; the server checks the waiting ones with Mobilab first. Calls made
 * while one is in flight share it.
 */
export function refreshPodBookings(memberId: string) {
  if (loading?.memberId === memberId) return loading.promise;
  const promise = api<{ bookings: PodBooking[] }>('/pod-bookings')
    .then(({ bookings }) => {
      snapshot = { memberId, bookings };
      listeners.forEach((listener) => listener());
    })
    .finally(() => {
      loading = null;
    });
  loading = { memberId, promise };
  return promise;
}

/** The signed-in member's pod bookings, newest first. `bookings` is null until the first load. */
export function usePodBookings() {
  const memberId = useAuth().member?.id;
  const current = useSyncExternalStore(subscribe, () => snapshot);
  const bookings = current && current.memberId === memberId ? current.bookings : null;
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    await refreshPodBookings(memberId).then(
      () => setError(null),
      (e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your bookings'),
    );
  }, [memberId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Moves a waiting booking to another pod; the list shows the new pod straight away. */
  const changePod = async (id: string, podId: string) => {
    if (!memberId) throw new Error('Please sign in');
    try {
      const { booking } = await api<{ booking: PodBooking }>(`/pod-bookings/${id}`, {
        method: 'PATCH',
        body: { podId },
      });
      snapshot = {
        memberId,
        bookings: (snapshot?.bookings ?? []).map((item) => (item.id === id ? booking : item)),
      };
      listeners.forEach((listener) => listener());
      return booking;
    } catch (e) {
      // The pod may have started on it meanwhile: show where it stands now.
      void refresh();
      throw e;
    }
  };

  return { bookings, error, refresh, changePod };
}
