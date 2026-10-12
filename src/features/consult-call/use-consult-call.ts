import { useCallback, useEffect, useState } from 'react';

import { ApiError } from '@/services/api';

import { consultCallApi } from './consult-call-api';

/** After a network error, wait this long before asking again, doubling up to `MAX_RETRY_MS`. */
const FIRST_RETRY_MS = 2000;
const MAX_RETRY_MS = 15_000;

export type CallPhase =
  /**
   * Asking the server for the room. `retry`: after the call dropped, so pause first. `closing`:
   * the room was closed on purpose, so ask straight away; it's usually ended or cancelled.
   */
  | { name: 'joining'; retry?: boolean; closing?: boolean }
  /**
   * In the Twilio room: in the waiting room until the doctor admits the member, then the call.
   * `admitted` is true when the doctor had already let them in before they joined.
   */
  | { name: 'room'; roomName: string; token: string; admitted: boolean; startedAt?: string }
  /** The member hung up; the consult is still running, so they can rejoin. */
  | { name: 'left' }
  /** The doctor ended the consult. */
  | { name: 'ended' }
  /** Can't be joined: cancelled, not open yet, or the doctor never started it. */
  | { name: 'closed'; message: string };

/**
 * Moves a consult call through its phases. The server is asked once on entering and again only
 * after a dropped call; everything else (the doctor arriving, admitting, ending) comes from the
 * Twilio room itself. Network errors retry with a growing pause and set `connectionIssue`.
 */
export function useConsultCall(consultId: string) {
  const [phase, setPhase] = useState<CallPhase>({ name: 'joining' });
  const [connectionIssue, setConnectionIssue] = useState<string | null>(null);
  const joining = phase.name === 'joining';
  const retry = phase.name === 'joining' && !!phase.retry;

  useEffect(() => {
    if (!joining) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let wait = FIRST_RETRY_MS;

    const join = async () => {
      try {
        const result = await consultCallApi.join(consultId);
        if (cancelled) return;
        setConnectionIssue(null);
        setPhase(result.state === 'ended' ? { name: 'ended' } : { name: 'room', ...result });
      } catch (error) {
        if (cancelled) return;
        const status = error instanceof ApiError ? error.status : 0;
        const message = error instanceof Error ? error.message : 'Something went wrong';
        if (status >= 400 && status < 500) {
          setPhase({ name: 'closed', message });
          return;
        }
        setConnectionIssue(message);
        timer = setTimeout(join, wait);
        wait = Math.min(wait * 2, MAX_RETRY_MS);
      }
    };

    // After a drop, pause first, so a call that keeps failing doesn't retry in a tight loop.
    timer = setTimeout(join, retry ? FIRST_RETRY_MS : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [consultId, joining, retry]);

  /** The room dropped without the member leaving: the doctor ended the consult, or the network did. */
  const onDisconnected = useCallback((reason?: string, closed?: boolean) => {
    if (reason) setConnectionIssue(reason);
    setPhase((current) =>
      current.name !== 'room'
        ? current
        : closed
          ? { name: 'joining', closing: true }
          : { name: 'joining', retry: true },
    );
  }, []);

  const hangUp = useCallback(() => setPhase({ name: 'left' }), []);
  const rejoin = useCallback(() => setPhase({ name: 'joining' }), []);

  return { phase, connectionIssue, onDisconnected, hangUp, rejoin };
}
