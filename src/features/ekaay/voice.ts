import {
  AudioQuality,
  RecordingPresets,
  createAudioPlayer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type AudioPlayer,
  type RecordingOptions,
} from 'expo-audio';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { playableAudio, readRecording } from './audio-files';
import { ekaayApi } from './ekaay-api';
import { speechLanguage, type EkaayLanguage } from './languages';

/** Which answer is being read aloud: `loading` while Gemini makes the audio. */
export type AnswerVoice = { id: string; state: 'loading' | 'playing' } | null;

/** Plays music and Ekaay at full volume, even with the ringer off; recording stays off. */
const PLAYBACK_MODE = { playsInSilentMode: true, allowsRecording: false } as const;

/**
 * Reads Ekaay's answers aloud with Gemini's voice (`server/gemini.ts`), one at a time. Without
 * Gemini, or if it fails for an answer, the phone's own voice reads it instead, as the website
 * falls back to the browser's voices.
 */
export function useAnswerVoice(language: EkaayLanguage | null, gemini: boolean) {
  const [voice, setVoice] = useState<AnswerVoice>(null);
  const playerRef = useRef<AudioPlayer | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  /** Bumped by every play and stop, so audio that arrives late for a stopped answer is dropped. */
  const turnRef = useRef(0);

  const release = useCallback(() => {
    releaseRef.current?.();
    releaseRef.current = null;
  }, []);

  const stop = useCallback(() => {
    turnRef.current += 1;
    playerRef.current?.pause();
    void Speech.stop();
    release();
    setVoice(null);
  }, [release]);

  // One player for the screen, made on first use and freed when the screen goes.
  useEffect(
    () => () => {
      turnRef.current += 1;
      playerRef.current?.remove();
      playerRef.current = null;
      void Speech.stop();
      releaseRef.current?.();
    },
    [],
  );

  const readOnPhone = useCallback((turn: number, id: string, text: string) => {
    const done = () => {
      if (turnRef.current === turn) setVoice(null);
    };
    setVoice({ id, state: 'playing' });
    Speech.speak(text, {
      language: speechLanguage(text, language),
      onDone: done,
      onStopped: done,
      onError: done,
    });
  }, [language]);

  const play = useCallback(
    async (id: string, text: string) => {
      stop();
      const turn = turnRef.current;
      if (!gemini) {
        readOnPhone(turn, id, text);
        return;
      }

      setVoice({ id, state: 'loading' });
      let audio: string;
      try {
        ({ audio } = await ekaayApi.speak(text, language ?? undefined));
      } catch {
        if (turnRef.current === turn) readOnPhone(turn, id, text);
        return;
      }
      if (turnRef.current !== turn) return;

      await setAudioModeAsync(PLAYBACK_MODE);
      const file = playableAudio(audio, id);
      releaseRef.current = file.release;
      let player = playerRef.current;
      if (!player) {
        player = playerRef.current = createAudioPlayer(null);
        player.addListener('playbackStatusUpdate', (status) => {
          if (!status.didJustFinish) return;
          releaseRef.current?.();
          releaseRef.current = null;
          setVoice(null);
        });
      }
      player.replace({ uri: file.uri });
      player.play();
      setVoice({ id, state: 'playing' });
    },
    [gemini, language, readOnPhone, stop],
  );

  return { voice, play, stop };
}

/** Mono AAC at 16 kHz and 32 kbps: clear for a voice, about 4 KB a second to send. */
const RECORDING: RecordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  sampleRate: 16_000,
  numberOfChannels: 1,
  bitRate: 32_000,
  ios: { ...RecordingPresets.HIGH_QUALITY.ios, audioQuality: AudioQuality.MEDIUM },
  web: { mimeType: 'audio/webm', bitsPerSecond: 32_000 },
};

/** A spoken question is cut off here; the server takes about two minutes. */
export const QUESTION_MAX_MS = 60_000;
/** Shorter than this is a stray tap, not a question. */
const QUESTION_MIN_MS = 600;

/** Records a spoken question for Gemini to turn into words. */
export function useVoiceQuestion() {
  const recorder = useAudioRecorder(RECORDING);
  const { isRecording, durationMillis } = useAudioRecorderState(recorder, 250);

  /** Starts listening; false when the member doesn't allow the microphone. */
  const start = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) return false;
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    return true;
  }, [recorder]);

  const end = useCallback(async () => {
    const duration = recorder.getStatus().durationMillis;
    await recorder.stop();
    // Back to playback, or iOS plays Ekaay's answer quietly through the earpiece.
    await setAudioModeAsync(PLAYBACK_MODE);
    return duration;
  }, [recorder]);

  /** Stops listening and hands back the question as base64 audio, or null if it was too short. */
  const finish = useCallback(async () => {
    const duration = await end();
    const uri = recorder.uri;
    if (!uri || duration < QUESTION_MIN_MS) return null;
    return readRecording(uri);
  }, [end, recorder]);

  /** Stops listening and throws the recording away. */
  const cancel = useCallback(async () => {
    if (recorder.getStatus().isRecording) await end();
  }, [end, recorder]);

  return { isRecording, durationMillis, start, finish, cancel };
}
