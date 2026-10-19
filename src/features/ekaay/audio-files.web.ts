/** `audio-files.ts` for the browser: answers play from blob URLs, recordings are blobs too. */

export function playableAudio(base64: string, _name: string) {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const uri = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
  return { uri, release: () => URL.revokeObjectURL(uri) };
}

/** A recorded question as base64, in the type the browser recorded (WebM, or MP4 in Safari). */
export async function readRecording(uri: string) {
  const blob = await (await fetch(uri)).blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return {
    audio: dataUrl.slice(dataUrl.indexOf(',') + 1),
    mimeType: blob.type.split(';')[0] || 'audio/webm',
  };
}
