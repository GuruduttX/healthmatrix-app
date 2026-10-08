import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/services/api';

import { type Dose } from './schedule';
import { type DoseStatus, type MedicineReminder, type ReminderDraft } from './types';

// One copy of the list, shared by the Care tab, the medicines screen, the form and the
// notification scheduler.
let snapshot: { memberId: string; reminders: MedicineReminder[] } | null = null;
const listeners = new Set<() => void>();
/** Bumped by every local change, so a list fetched before it does not overwrite it. */
let version = 0;
/** The newest change per reminder; an older change's answer for the same one is not shown. */
const latest = new Map<string, number>();
/** Changes reach the server one at a time, in the order they were made. */
let queue: Promise<unknown> = Promise.resolve();
let loading: { memberId: string; promise: Promise<void> } | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(memberId: string, reminders: MedicineReminder[]) {
  snapshot = { memberId, reminders };
  listeners.forEach((listener) => listener());
}

function listFor(memberId: string) {
  return snapshot?.memberId === memberId ? snapshot.reminders : [];
}

function upsert(memberId: string, reminder: MedicineReminder) {
  const list = listFor(memberId);
  publish(
    memberId,
    list.some((other) => other.id === reminder.id)
      ? list.map((other) => (other.id === reminder.id ? reminder : other))
      : [...list, reminder],
  );
}

/** Fetches the list again. Calls made while one is in flight share it. */
export function refreshReminders(memberId: string) {
  if (loading?.memberId === memberId) return loading.promise;
  const startedAt = version;
  const promise = api<{ reminders: MedicineReminder[] }>('/reminders')
    .then(({ reminders }) => {
      if (version === startedAt) publish(memberId, reminders);
    })
    .finally(() => {
      loading = null;
    });
  loading = { memberId, promise };
  return promise;
}

/**
 * Queues a server change to one reminder (`key`). `apply` runs with the answer unless a newer
 * change to the same reminder was made meanwhile; that one's answer will be shown instead.
 */
function mutate<T>(key: string, request: () => Promise<T>, apply: (result: T) => void) {
  const mine = (version += 1);
  latest.set(key, mine);
  const result = queue.then(request);
  queue = result.catch(() => undefined);
  return result.then((value) => {
    if (latest.get(key) === mine) apply(value);
    return value;
  });
}

const message = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

/** The signed-in member's medicine reminders. `reminders` is null until the first load. */
export function useReminders() {
  const memberId = useAuth().member?.id;
  const current = useSyncExternalStore(subscribe, () => snapshot);
  const reminders = current && current.memberId === memberId ? current.reminders : null;
  const [error, setError] = useState<string | null>(null);

  /** Loads the list again, e.g. on pull-to-refresh. */
  const refresh = useCallback(async () => {
    if (!memberId) return;
    await refreshReminders(memberId).then(
      () => setError(null),
      (e: unknown) => setError(message(e, 'Could not load your medicines')),
    );
  }, [memberId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signedIn = () => {
    if (!memberId) throw new Error('Please sign in');
    return memberId;
  };

  const create = async (draft: ReminderDraft) => {
    const id = signedIn();
    const { reminder } = await mutate(
      `new:${version}`,
      () => api<{ reminder: MedicineReminder }>('/reminders', { method: 'POST', body: draft }),
      ({ reminder: saved }) => upsert(id, saved),
    );
    return reminder;
  };

  /** Send only what changed, e.g. `{ isActive: false }`. */
  const update = async (reminderId: string, patch: Partial<ReminderDraft>) => {
    const id = signedIn();
    const before = listFor(id).find((reminder) => reminder.id === reminderId);
    // Pausing shows at once; the form waits for the server anyway.
    if (before && patch.isActive !== undefined) upsert(id, { ...before, isActive: patch.isActive });
    try {
      const { reminder } = await mutate(
        reminderId,
        () =>
          api<{ reminder: MedicineReminder }>(`/reminders/${reminderId}`, {
            method: 'PATCH',
            body: patch,
          }),
        ({ reminder: saved }) => upsert(id, saved),
      );
      return reminder;
    } catch (e) {
      if (before) upsert(id, before);
      throw e;
    }
  };

  const remove = async (reminderId: string) => {
    const id = signedIn();
    await mutate(
      reminderId,
      () => api<null>(`/reminders/${reminderId}`, { method: 'DELETE' }),
      () => publish(id, listFor(id).filter((reminder) => reminder.id !== reminderId)),
    );
  };

  /** Marks a dose taken or skipped (`null` clears it). Shows at once, undone if saving fails. */
  const markDose = async (dose: Dose, status: DoseStatus | null) => {
    const id = signedIn();
    const before = listFor(id).find((reminder) => reminder.id === dose.reminder.id);
    if (!before) return;
    const others = before.log.filter((mark) => mark.date !== dose.date || mark.time !== dose.time);
    upsert(id, {
      ...before,
      log: status ? [...others, { date: dose.date, time: dose.time, status }] : others,
    });

    try {
      await mutate(
        dose.reminder.id,
        () =>
          api<{ reminder: MedicineReminder }>(`/reminders/${dose.reminder.id}/doses`, {
            method: 'PUT',
            body: { date: dose.date, time: dose.time, status },
          }),
        ({ reminder: saved }) => upsert(id, saved),
      );
    } catch (e) {
      upsert(id, before);
      throw e;
    }
  };

  return { reminders, error, refresh, create, update, remove, markDose };
}
