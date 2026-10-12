import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { api } from '@/services/api';

import { type PastConsult } from './types';

/**
 * The member's completed consults, newest first. `consults` is null until the first load. Loads
 * again whenever the screen comes into view, so a consult that just ended shows up.
 */
export function usePastConsults() {
  const [consults, setConsults] = useState<PastConsult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await api<{ consults: PastConsult[] }>('/consults?when=past');
      setConsults(result.consults);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your past consults');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { consults, error, refresh };
}
