import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { faceScanApi } from './face-scan-api';
import { type FaceScan } from './vitals';

/** The member's past face scans, newest first; fetched again whenever the screen comes back. */
export function useFaceScans() {
  const [scans, setScans] = useState<FaceScan[] | null>(null);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(
    () =>
      faceScanApi.list().then(
        (list) => {
          setScans(list);
          setFailed(false);
        },
        () => setFailed(true),
      ),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { scans, failed, refresh };
}

/** "Today, 4:30 pm", "Yesterday", "12 Oct". */
export function scanWhen(iso: string) {
  const at = new Date(iso);
  const today = new Date();
  const days = Math.round(
    (new Date(today.toDateString()).getTime() - new Date(at.toDateString()).getTime()) / 86_400_000,
  );
  const time = at.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return 'Yesterday';
  return at.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
