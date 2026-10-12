import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/services/api';

import { consultCallApi } from './consult-call-api';

/** How often the waiting room checks in, which is also how quickly the call opens. */
const POLL_MS = 4000;

export type CallPhase =
  /** In the waiting room until the doctor starts the consult in the console. */
  | { name: 'waiting' }
  /** Getting a fresh token after the call dropped (`dropped`) or the member chose to rejoin. */
  | { name: 'connecting'; dropped?: boolean }
  | { name: 'live'; roomName: string; token: string; startedAt?: string }
  /** The member hung up; the consult is still running, so they can rejoin. */
  | { name: 'left' }
  /** The doctor ended the consult. */
  | { name: 'ended' }
  /** Can't be joined: cancelled, not open yet, or the doctor never started it. */
  | { name: 'closed'; message: string };

/**
 * Moves a consult call through its phases. While waiting or connecting it asks the server every
 * few seconds; network blips keep it asking and set `connectionIssue` instead of failing.
 */
export function useConsultCall(consultId: string) {
  const [phase, setPhase] = useState<CallPhase>({ name: 'waiting' });
  const [connectionIssue, setConnectionIssue] = useState<string | null>(null);
  const polling = phase.name === 'waiting' || phase.name === 'connecting';
  // After a drop, wait a moment first, so a call that keeps failing doesn't retry in a tight loop.
  const firstDelay = phase.name === 'connecting' && phase.dropped ? 2000 : 0;

  useEffect(() => {
    if (!polling) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      try {
        const result = await consultCallApi.join(consultId);
        if (cancelled) return;
        setConnectionIssue(null);
        if (result.state === 'live') {
          setPhase({ name: 'live', ...result });
          return;
        }
        if (result.state === 'ended') {
          setPhase({ name: 'ended' });
          return;
        }
      } catch (error) {
        if (cancelled) return;
        const status = error instanceof ApiError ? error.status : 0;
        const message = error instanceof Error ? error.message : 'Something went wrong';
        if (status >= 400 && status < 500) {
          setPhase({ name: 'closed', message });
          return;
        }
        setConnectionIssue(message);
      }
      timer = setTimeout(check, POLL_MS);
    };

    timer = setTimeout(check, firstDelay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [consultId, polling, firstDelay]);

  // Leaving the screen from the waiting room takes the member off the doctor's waiting list.
  useEffect(
    () => () => {
      consultCallApi.leaveLobby(consultId).catch(() => {});
    },
    [consultId],
  );

  /** The call dropped without the member hanging up: the doctor ended it, or the network did. */
  const onDisconnected = useCallback((reason?: string) => {
    if (reason) setConnectionIssue(reason);
    setPhase((current) =>
      current.name === 'live' ? { name: 'connecting', dropped: true } : current,
    );
  }, []);

  const hangUp = useCallback(() => setPhase({ name: 'left' }), []);
  const rejoin = useCallback(() => setPhase({ name: 'connecting' }), []);

  return { phase, connectionIssue, onDisconnected, hangUp, rejoin };
}
