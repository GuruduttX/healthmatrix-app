import { Platform } from 'react-native';

import { api } from '@/services/api';

import { type FaceScan } from './vitals';

/**
 * Whether finished face scans are saved to the member's account (history, and Ekaay reading
 * them). On since testing finished (2026-10-19). Off, results live only in the app's memory, so
 * Home and the scan screen show them until the app closes, and nothing reaches the server.
 * The camera video is never stored either way.
 */
export const KEEP_FACE_SCANS = true;

/** Scans from this run of the app, newest first, while `KEEP_FACE_SCANS` is off. */
let unsaved: FaceScan[] = [];

/** Matches `src/app/api/v1/face-scans+api.ts`. */
export const faceScanApi = {
  /** The member's face scans, newest first. */
  list: async () =>
    KEEP_FACE_SCANS
      ? api<{ scans: FaceScan[] }>('/face-scans').then(({ scans }) => scans)
      : unsaved,

  /** Keeps a finished scan, so it shows in history and Ekaay can explain it. */
  save: async (scan: FaceScan) => {
    if (!KEEP_FACE_SCANS) {
      const kept = { ...scan, id: `local-${Date.now()}` };
      unsaved = [kept, ...unsaved].slice(0, 20);
      return kept;
    }
    return api<{ scan: FaceScan }>('/face-scans', {
      method: 'POST',
      body: { ...scan, platform: Platform.OS },
    }).then(({ scan: saved }) => saved);
  },
};
