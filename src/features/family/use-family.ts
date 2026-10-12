import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/services/api';

import { type FamilyMember, type FamilyViewer, type Relation } from './types';

type FamilyList = { members: FamilyMember[]; viewers: FamilyViewer[] };

// One copy of the member's family, shared by the Card tab and the add and family screens.
let snapshot: ({ memberId: string } & FamilyList) | null = null;
const listeners = new Set<() => void>();
let loading: { memberId: string; promise: Promise<void> } | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(memberId: string, list: FamilyList) {
  snapshot = { memberId, ...list };
  listeners.forEach((listener) => listener());
}

/** Fetches the family again. Calls made while one is in flight share it. */
export function refreshFamily(memberId: string) {
  if (loading?.memberId === memberId) return loading.promise;
  const promise = api<FamilyList>('/family')
    .then((list) => publish(memberId, list))
    .finally(() => {
      loading = null;
    });
  loading = { memberId, promise };
  return promise;
}

export type InviteRequest = { phone: string; name: string; relation: Relation };
export type InviteResult = { sent: boolean; hasAccount: boolean; devCode?: string };

export const familyApi = {
  /** Texts a code to the family member's phone. */
  invite: (request: InviteRequest) =>
    api<InviteResult>('/family/invite', { method: 'POST', body: request }),
  /** Checks the code they read out, and adds them. */
  verify: (phone: string, code: string) =>
    api<{ member: FamilyMember }>('/family/verify', { method: 'POST', body: { phone, code } }),
};

/**
 * The signed-in member's family (`members`) and who can see their own records (`viewers`). Both
 * are null until the first load.
 */
export function useFamily() {
  const memberId = useAuth().member?.id;
  const current = useSyncExternalStore(subscribe, () => snapshot);
  const list = current && current.memberId === memberId ? current : null;
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!memberId) return;
    await refreshFamily(memberId).then(
      () => setError(null),
      (e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your family'),
    );
  }, [memberId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Ends a link from either side: removes a family member, or stops someone seeing yours. */
  const removeLink = async (linkId: string) => {
    if (!memberId) throw new Error('Please sign in');
    await api<null>(`/family/links/${linkId}`, { method: 'DELETE' });
    const base = list ?? { members: [], viewers: [] };
    publish(memberId, {
      members: base.members.filter((m) => m.linkId !== linkId),
      viewers: base.viewers.filter((v) => v.linkId !== linkId),
    });
  };

  /** Puts a just-added member on the list straight away. */
  const added = (member: FamilyMember) => {
    if (!memberId) return;
    const base = list ?? { members: [], viewers: [] };
    publish(memberId, {
      ...base,
      members: [...base.members.filter((m) => m.id !== member.id), member],
    });
  };

  return {
    members: list?.members ?? null,
    viewers: list?.viewers ?? null,
    error,
    refresh,
    removeLink,
    added,
  };
}
