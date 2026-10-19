import { useCallback, useRef, useState } from 'react';

import { analyse, liveWave, type Sample } from './dsp';
import { faceScanApi } from './face-scan-api';
import { type FrameReading } from './geometry';
import { rppgEngine, type FaceScan, type VitalsEngine } from './vitals';

/** Seconds of steady signal a scan needs: enough for the heart rate and a few dozen breaths' worth. */
export const SCAN_SECONDS = 40;
/** A scan that can't gather that much in this long stops and says why. */
const GIVE_UP_SECONDS = 100;
/** A face missing longer than this starts the count again: the signal has a gap. */
const GAP_SECONDS = 1.2;
/** The face is in the oval when this much of the oval's middle is skin (a face gives about 0.99). */
const FACE_SKIN = 0.6;
/** Screen updates a second for the progress, the message and the live trace. */
const UI_RATE = 10;

export type ScanPhase = 'ready' | 'scanning' | 'result' | 'failed';
export type ScanFailure = 'noisy' | 'short' | 'camera';

type Session = {
  samples: Sample[];
  /** Seconds of good signal so far. */
  good: number;
  startedAt: number | null;
  lastGood: number | null;
  previousLuma: number | null;
  /** Frames left to show "Keep still" after a jump in brightness. */
  moving: number;
  found: boolean;
  /** When the count last started again, to say so for a moment. */
  restartedAt: number | null;
  frames: number;
  lastUi: number;
};

const newSession = (): Session => ({
  samples: [],
  good: 0,
  startedAt: null,
  lastGood: null,
  previousLuma: null,
  moving: 0,
  found: false,
  restartedAt: null,
  frames: 0,
  lastUi: 0,
});

/**
 * A face scan from start to result: takes the camera's frame readings, keeps the ones where a
 * face is in the oval in good light, guides the member while it does, then measures the vitals
 * and keeps the result. Ported from the scan on cloudspital.ai.
 */
export function useFaceScan(engine: VitalsEngine = rppgEngine) {
  const [phase, setPhase] = useState<ScanPhase>('ready');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [faceInOval, setFaceInOval] = useState(false);
  const [pulseFound, setPulseFound] = useState(false);
  const [wave, setWave] = useState<ArrayLike<number> | null>(null);
  const [lockExposure, setLockExposure] = useState(false);
  const [result, setResult] = useState<FaceScan | null>(null);
  const [failure, setFailure] = useState<{ why: ScanFailure; message?: string } | null>(null);
  const [saved, setSaved] = useState<'saving' | 'saved' | 'failed' | null>(null);
  const session = useRef<Session>(newSession());
  const phaseRef = useRef<ScanPhase>('ready');

  const moveTo = useCallback((next: ScanPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const start = useCallback(() => {
    session.current = newSession();
    setMessage('Fit your face inside the oval');
    setProgress(0);
    setFaceInOval(false);
    setPulseFound(false);
    setWave(null);
    setLockExposure(false);
    setResult(null);
    setFailure(null);
    setSaved(null);
    moveTo('scanning');
  }, [moveTo]);

  const cancel = useCallback(() => {
    setLockExposure(false);
    moveTo('ready');
  }, [moveTo]);

  const save = useCallback(async (scan: FaceScan) => {
    setSaved('saving');
    try {
      const kept = await faceScanApi.save(scan);
      setResult(kept);
      setSaved('saved');
    } catch {
      setSaved('failed');
    }
  }, []);

  const finish = useCallback(() => {
    setLockExposure(false);
    const outcome = engine.analyse(session.current.samples);
    if ('why' in outcome) {
      setFailure({ why: outcome.why });
      moveTo('failed');
      return;
    }
    setResult(outcome);
    moveTo('result');
    void save(outcome);
  }, [engine, moveTo, save]);

  const onCameraError = useCallback(
    (text: string) => {
      setLockExposure(false);
      setFailure({ why: 'camera', message: text });
      moveTo('failed');
    },
    [moveTo],
  );

  const onFrame = useCallback(
    ({ t, r, g, b, skin, luma }: FrameReading) => {
      if (phaseRef.current !== 'scanning') return;
      const s = session.current;
      s.frames++;
      if (s.startedAt === null) s.startedAt = t;

      // A frame where no pixel matched the face's tone has no colour to give.
      const face = skin > FACE_SKIN && r + g + b > 0;
      const lightOk = luma > 42 && luma < 238;
      if (s.previousLuma !== null && Math.abs(luma - s.previousLuma) > 3.5) s.moving = 12;
      else if (s.moving) s.moving--;
      s.previousLuma = luma;

      if (face && lightOk) {
        if (s.lastGood !== null && t - s.lastGood > GAP_SECONDS) {
          // A gap in the signal: start the count again, and let the camera re-adjust to the light.
          s.samples = [];
          s.good = 0;
          s.found = false;
          s.restartedAt = t;
          setPulseFound(false);
          setLockExposure(false);
        } else if (s.lastGood !== null) {
          s.good += Math.min(0.25, Math.max(0, t - s.lastGood));
        }
        s.samples.push({ t, r, g, b });
        s.lastGood = t;
        // Hold the exposure once the face has been steady in the oval for a moment.
        if (s.good > 1.5) setLockExposure(true);
      }

      if (s.good >= SCAN_SECONDS || t - s.startedAt > GIVE_UP_SECONDS) {
        finish();
        return;
      }

      // The screen, about ten times a second.
      if (t - s.lastUi < 1 / UI_RATE) return;
      s.lastUi = t;
      setFaceInOval(face);
      setProgress(Math.min(1, s.good / SCAN_SECONDS));
      if (s.samples.length > 60) setWave(liveWave(s.samples));
      // "Pulse found" once the last 12 seconds give a clear heart rate on their own.
      if (!s.found && s.good > 8 && s.frames % 3 === 0) {
        const recent = s.samples.filter((sample) => sample.t > t - 12);
        if (analyse(recent, true).ok) {
          s.found = true;
          setPulseFound(true);
        }
      }
      setMessage(
        s.restartedAt !== null && t - s.restartedAt < 2
          ? 'Face lost. Starting again, keep still'
          : !face
            ? 'Fit your face inside the oval'
            : luma <= 42
              ? 'Find more light, facing a window or lamp'
              : luma >= 238
                ? 'Too bright: move out of direct light'
                : s.moving
                  ? 'Keep still'
                  : s.found
                    ? 'Pulse found. Keep still and breathe normally'
                    : 'Hold still, finding your pulse',
      );
    },
    [finish],
  );

  return {
    phase,
    message,
    progress,
    secondsLeft: Math.max(0, Math.ceil(SCAN_SECONDS * (1 - progress))),
    faceInOval,
    pulseFound,
    wave,
    lockExposure,
    result,
    failure,
    saved,
    measures: engine.measures,
    start,
    cancel,
    onFrame,
    onCameraError,
    retrySave: () => (result ? save(result) : undefined),
  };
}
