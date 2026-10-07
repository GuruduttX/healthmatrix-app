import { useEffect, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/services/api';

import { type VaccinationRecord } from './types';

// One copy of the member's vaccines, shared by the Care tab, the record screen and the
// notification scheduler.
let snapshot: { memberId: string; vaccinations: VaccinationRecord[] } | null = null;
const listeners = new Set<() => void>();
let loading: { memberId: string; promise: Promise<void> } | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(memberId: string, vaccinations: VaccinationRecord[]) {
  snapshot = { memberId, vaccinations };
  listeners.forEach((listener) => listener());
}

/** Fetches the list again. Calls made while one is in flight share it. */
export function refreshVaccinations(memberId: string) {
  if (loading?.memberId === memberId) return loading.promise;
  const promise = api<{ vaccinations: VaccinationRecord[] }>('/vaccinations')
    .then(({ vaccinations }) => publish(memberId, vaccinations))
    .finally(() => {
      loading = null;
    });
  loading = { memberId, promise };
  return promise;
}

/**
 * Marks a dose given (on `givenOn`, India time; today if left out) or not given. Returns the
 * vaccine as saved, and updates every screen showing it.
 */
export async function markVaccineDose(
  memberId: string,
  vaccinationId: string,
  doseNumber: number,
  given: boolean,
  givenOn?: string,
) {
  const { vaccination } = await api<{ vaccination: VaccinationRecord }>(
    `/vaccinations/${vaccinationId}/doses/${doseNumber}`,
    { method: 'PUT', body: { given, givenOn } },
  );
  if (snapshot?.memberId === memberId) {
    publish(
      memberId,
      snapshot.vaccinations.map((v) => (v.id === vaccination.id ? vaccination : v)),
    );
  }
  return vaccination;
}

/** The signed-in member's vaccines. `vaccinations` is null until the first load. */
export function useVaccinations() {
  const memberId = useAuth().member?.id;
  const current = useSyncExternalStore(subscribe, () => snapshot);
  const vaccinations = current && current.memberId === memberId ? current.vaccinations : null;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;
    refreshVaccinations(memberId).then(
      () => setError(null),
      (e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your vaccines'),
    );
  }, [memberId]);

  const markDose = (
    vaccinationId: string,
    doseNumber: number,
    given: boolean,
    givenOn?: string,
  ) => {
    if (!memberId) return Promise.reject(new Error('Please sign in'));
    return markVaccineDose(memberId, vaccinationId, doseNumber, given, givenOn);
  };

  return { vaccinations, error, markDose };
}
