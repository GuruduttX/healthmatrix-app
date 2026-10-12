import { api } from '@/services/api';

/** The waiting room opens this long before the slot. Matches `JOIN_OPENS_MS` in `server/video.ts`. */
export const JOIN_OPENS_MS = 5 * 60 * 1000;

/** Matches the consult join route, `src/app/api/v1/consults/[id]/join+api.ts`. */
export type JoinResult =
  | { state: 'waiting' }
  | { state: 'ended'; endedAt?: string }
  | { state: 'live'; roomName: string; token: string; startedAt?: string };

export const consultCallApi = {
  /** Checks in from the waiting room; answers with the room once the doctor has started. */
  join: (consultId: string) => api<JoinResult>(`/consults/${consultId}/join`, { method: 'POST' }),
  leaveLobby: (consultId: string) => api<null>(`/consults/${consultId}/join`, { method: 'DELETE' }),
};
