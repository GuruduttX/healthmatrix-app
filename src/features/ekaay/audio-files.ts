import { File, Paths } from 'expo-file-system';

/**
 * Audio passing between Ekaay and the phone. The player can't take audio as data, so an answer is
 * written to a cache file first; a recorded question is read back from its file to be sent.
 * `audio-files.web.ts` does the same in the browser with blobs.
 */

/** A base64 WAV as something the player can open, and a way to throw it away afterwards. */
export function playableAudio(base64: string, name: string) {
  const file = new File(Paths.cache, `ekaay-${name}.wav`);
  file.create({ overwrite: true });
  file.write(base64, { encoding: 'base64' });
  return {
    uri: file.uri,
    release: () => {
      try {
        file.delete();
      } catch {
        // Already gone; the cache is the system's to clear anyway.
      }
    },
  };
}

/** A recorded question as base64, with its type. Both iOS and Android record AAC in an .m4a. */
export async function readRecording(uri: string) {
  const file = new File(uri);
  const audio = await file.base64();
  file.delete();
  return { audio, mimeType: 'audio/m4a' };
}
