import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { api } from '@/services/api';

import { type LabProfile, type LabTest, type Pod } from './types';

type Catalog = { pods: Pod[]; tests: LabTest[]; profiles: LabProfile[] };

// One copy of the pods and the tests they run, shared by the Care tab and the pod finder.
// The same for every member, so it is kept across sign-ins.
let snapshot: Catalog | null = null;
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether pods and tests have loaded at least once. */
export const podCatalogLoaded = () => snapshot !== null;

/** Fetches pods and tests again. Calls made while one is in flight share it. */
export function refreshPodCatalog() {
  loading ??= Promise.all([
    api<{ pods: Pod[] }>('/pods'),
    api<{ tests: LabTest[]; profiles: LabProfile[] }>('/lab-catalog'),
  ])
    .then(([{ pods }, { tests, profiles }]) => {
      snapshot = { pods, tests, profiles };
      listeners.forEach((listener) => listener());
    })
    .finally(() => {
      loading = null;
    });
  return loading;
}

/**
 * Pods that take bookings, and the tests and profiles they run. `catalog` is null until the first
 * load; `error` is set when that failed and nothing is shown yet.
 */
export function usePodCatalog() {
  const catalog = useSyncExternalStore(subscribe, () => snapshot);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    () =>
      refreshPodCatalog().then(
        () => setError(null),
        (e: unknown) => setError(e instanceof Error ? e.message : 'Could not load pods'),
      ),
    [],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { catalog, error, refresh };
}
