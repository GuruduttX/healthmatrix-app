import { api } from '@/services/api';

/** The waiting room opens this long before the slot. Matches `JOIN_OPENS_MS` in `server/video.ts`. */
export const JOIN_OPENS_MS = 5 * 60 * 1000;

/** Matches the consult join route, `src/app/api/v1/consults/[id]/join+api.ts`. */
export type JoinResult =
  | { state: 'ended'; endedAt?: string }
  | {
      state: 'ready';
      roomName: string;
      token: string;
      /** The doctor has already let the member in, so skip the waiting room. */
      admitted: boolean;
      startedAt?: string;
    };

export const consultCallApi = {
  /** Opens the consult's room for the member: once on entering, and again after a drop. */
  join: (consultId: string) => api<JoinResult>(`/consults/${consultId}/join`, { method: 'POST' }),
};
