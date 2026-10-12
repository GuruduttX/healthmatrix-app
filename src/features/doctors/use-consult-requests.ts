import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/services/api';

import { type ConsultRequest, type Specialty } from './types';

// One copy of the member's custom-time requests, shared by the Care tab and the booking screen.
let snapshot: { memberId: string; requests: ConsultRequest[] } | null = null;
const listeners = new Set<() => void>();
let loading: { memberId: string; promise: Promise<void> } | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(memberId: string, requests: ConsultRequest[]) {
  const sorted = [...requests].sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
  snapshot = { memberId, requests: sorted };
  listeners.forEach((listener) => listener());
}

/** Fetches the requests again. Calls made while one is in flight share it. */
export function refreshConsultRequests(memberId: string) {
  if (loading?.memberId === memberId) return loading.promise;
  const promise = api<{ requests: ConsultRequest[] }>('/consult-requests')
    .then(({ requests }) => publish(memberId, requests))
    .finally(() => {
      loading = null;
    });
  loading = { memberId, promise };
  return promise;
}

export type TimeRequest = {
  doctorId: string;
  specialty: Specialty;
  /** ISO, on a 5-minute mark. */
  requestedAt: string;
  reason?: string;
};

/**
 * The member's custom-time requests: waiting for the doctor, or declined or unanswered lately.
 * `requests` is null until the first load.
 */
export function useConsultRequests() {
  const memberId = useAuth().member?.id;
  const current = useSyncExternalStore(subscribe, () => snapshot);
  const requests = current && current.memberId === memberId ? current.requests : null;
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    await refreshConsultRequests(memberId).then(
      () => setError(null),
      (e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your requests'),
    );
  }, [memberId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const send = async (request: TimeRequest) => {
    if (!memberId) throw new Error('Please sign in');
    const { request: sent } = await api<{ request: ConsultRequest }>('/consult-requests', {
      method: 'POST',
      body: request,
    });
    publish(memberId, [...(requests ?? []), sent]);
    return sent;
  };

  const withdraw = async (id: string) => {
    if (!memberId) throw new Error('Please sign in');
    try {
      await api<null>(`/consult-requests/${id}`, {
        method: 'PATCH',
        body: { status: 'withdrawn' },
      });
      publish(
        memberId,
        (requests ?? []).filter((request) => request.id !== id),
      );
    } catch (e) {
      // Answered meanwhile: show the doctor's answer instead.
      void refresh();
      throw e;
    }
  };

  return { requests, error, refresh, send, withdraw };
}
