import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { api } from '@/services/api';

import { type FeaturedDoctor } from './types';

/** While the Care tab is open, check this often whether the doctor is still online. */
const POLL_MS = 60_000;

/**
 * A doctor who has consulted the member before and is online now, for the Care tab's top card.
 * `featured` is `undefined` until the first load and `null` when there is none. Loads again whenever the tab
 * comes into view, then every minute while it stays open.
 */
export function useFeaturedDoctor() {
  const [featured, setFeatured] = useState<FeaturedDoctor | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const result = await api<{ featured: FeaturedDoctor | null }>('/doctors/featured');
      setFeatured(result.featured);
    } catch {
      // Keep what is shown; without an answer the general card shows.
      setFeatured((current) => current ?? null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const timer = setInterval(() => void refresh(), POLL_MS);
      return () => clearInterval(timer);
    }, [refresh]),
  );

  return { featured, refresh };
}
