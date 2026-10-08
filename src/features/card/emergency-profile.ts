import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/services/api';
import { type BloodGroup, type Member } from '@/types';

/** What a member can show or hide on the public emergency page. Mirrors the server's list. */
export const EMERGENCY_FIELDS = [
  { id: 'photo', label: 'Photo' },
  { id: 'bloodGroup', label: 'Blood group' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'conditions', label: 'Conditions' },
  { id: 'medicines', label: 'Medicines' },
  { id: 'emergencyContacts', label: 'Emergency contacts' },
  { id: 'organDonor', label: 'Organ donor' },
  { id: 'insurance', label: 'Insurance' },
] as const;

export type EmergencyFieldId = (typeof EMERGENCY_FIELDS)[number]['id'];

export type EmergencyContact = { name: string; relation?: string; phone: string };

export type EmergencyProfile = {
  bloodGroup?: BloodGroup;
  allergies: string[];
  conditions: string[];
  medicines: string[];
  emergencyContacts: EmergencyContact[];
  organDonor?: boolean;
  insurance?: { provider: string; policyNumber?: string };
  visibleFields: EmergencyFieldId[];
};

/** Any part of the profile; `null` clears a field. */
export type EmergencyProfileUpdate = Partial<{
  bloodGroup: BloodGroup | null;
  allergies: string[];
  conditions: string[];
  medicines: string[];
  emergencyContacts: EmergencyContact[];
  organDonor: boolean | null;
  insurance: { provider: string; policyNumber?: string } | null;
  visibleFields: EmergencyFieldId[];
}>;

/** True when the member has entered nothing a responder could use. */
export function isEmpty(profile: EmergencyProfile) {
  return (
    !profile.bloodGroup &&
    !profile.allergies.length &&
    !profile.conditions.length &&
    !profile.medicines.length &&
    !profile.emergencyContacts.length &&
    profile.organDonor === undefined &&
    !profile.insurance
  );
}

// One copy shared by the Card screen, the editor and the responder preview.
let snapshot: { memberId: string; profile: EmergencyProfile } | null = null;
const listeners = new Set<() => void>();
/** Bumped on every local change, so a slower earlier fetch cannot overwrite it. */
let version = 0;
/** Saves run one at a time, so quick toggles reach the server in order. */
let queue: Promise<unknown> = Promise.resolve();

function publish(memberId: string, profile: EmergencyProfile) {
  snapshot = { memberId, profile };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The signed-in member's emergency profile, fetched fresh whenever a screen using it opens. */
export function useEmergencyProfile() {
  const { member, updateMember } = useAuth();
  const memberId = member?.id;
  const current = useSyncExternalStore(subscribe, () => snapshot);
  const profile = current && current.memberId === memberId ? current.profile : null;
  const [error, setError] = useState<string | null>(null);

  /** Loads the profile again, e.g. on pull-to-refresh. */
  const refresh = useCallback(async () => {
    if (!memberId) return;
    const startedAt = version;
    await api<{ profile: EmergencyProfile }>('/members/me/emergency')
      .then(({ profile: fresh }) => {
        if (version === startedAt) publish(memberId, fresh);
        setError(null);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : 'Could not load your emergency profile'),
      );
  }, [memberId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Saves a change. With `optimistic`, the screen shows it before the server confirms. */
  const save = (update: EmergencyProfileUpdate, { optimistic = false } = {}) => {
    if (!memberId) return Promise.reject(new Error('Please sign in'));
    const mine = (version += 1);
    const before = profile;
    if (optimistic && before) publish(memberId, { ...before, ...(update as Partial<EmergencyProfile>) });

    const request = queue.then(() =>
      api<{ profile: EmergencyProfile; member: Member }>('/members/me/emergency', {
        method: 'PATCH',
        body: update,
      }),
    );
    queue = request.catch(() => undefined);

    return request.then(
      async ({ profile: saved, member: savedMember }) => {
        // A newer change is still on its way; its answer will be the one to show.
        if (version === mine) publish(memberId, saved);
        await updateMember(savedMember);
        return saved;
      },
      (e: unknown) => {
        if (optimistic && before) publish(memberId, before);
        throw e;
      },
    );
  };

  return { profile, error, refresh, save };
}
