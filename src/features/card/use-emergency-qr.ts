import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { api } from '@/services/api';
import { storage } from '@/services/storage';

export type EmergencyQr = {
  /** The revocable code inside the link. */
  code: string;
  /** The public emergency page the QR opens. */
  url: string;
};

const CACHE_KEY = 'healthmatrix.emergencyQr';

type Cached = EmergencyQr & { memberId: string };

function parseCached(json: string | null): Cached | null {
  try {
    return json ? (JSON.parse(json) as Cached) : null;
  } catch {
    return null;
  }
}

/**
 * The signed-in member's emergency QR. A saved copy shows straight away, even offline, so the
 * card works when it is needed most; the server copy replaces it once it arrives.
 */
export function useEmergencyQr() {
  const memberId = useAuth().member?.id;
  const [qr, setQr] = useState<EmergencyQr | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memberId) return;
    let active = true;

    storage.get(CACHE_KEY).then((json) => {
      const cached = parseCached(json);
      // The saved copy may belong to someone who used this phone before.
      if (active && cached?.memberId === memberId) {
        setQr((current) => current ?? { code: cached.code, url: cached.url });
      }
    });

    api<{ qr: EmergencyQr }>('/members/me/qr')
      .then(({ qr: fresh }) => {
        if (!active) return;
        setQr(fresh);
        setError(null);
        return storage.set(CACHE_KEY, JSON.stringify({ ...fresh, memberId }));
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load your QR');
      });

    return () => {
      active = false;
    };
  }, [memberId]);

  return { qr, error };
}
