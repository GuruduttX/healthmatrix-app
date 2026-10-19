import { useEffect, useRef } from 'react';

import { readFrame, type Tone } from './frame-reader';
import { type ScanCameraProps } from './scan-camera';

/** The browser needs a camera it can ask for. */
export const scanCameraAvailable =
  typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

/** Small enough to read every frame, big enough for a steady mean: 3:4, like the regions. */
const SAMPLE_WIDTH = 192;
const SAMPLE_HEIGHT = 256;

/**
 * `scan-camera.tsx` for the browser: the front camera in a <video>, each frame drawn small onto a
 * canvas and read there (`frame-reader.ts`), as the scan on cloudspital.ai does. Exposure can't be
 * locked in a browser, so `lockExposure` does nothing here.
 */
export function ScanCamera({ active, onFrame, onError }: ScanCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The latest handlers, so a re-render doesn't restart the camera.
  const handlers = useRef({ onFrame, onError });
  useEffect(() => {
    handlers.current = { onFrame, onError };
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let frameHandle = 0;
    // The face's skin tone, carried from frame to frame.
    let tone: Tone | null = null;
    const canvas = document.createElement('canvas');
    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const read = (now: number, captureTime?: number) => {
      if (stopped || !context || video.readyState < 2 || !video.videoWidth) return schedule();
      // The middle of the frame at 3:4, as the <video> shows it with object-fit: cover.
      const { videoWidth: vw, videoHeight: vh } = video;
      const sw = Math.min(vw, (vh * 3) / 4);
      const sh = Math.min(vh, (vw * 4) / 3);
      context.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
      const pixels = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT).data;
      const { reading, tone: next } = readFrame(pixels, SAMPLE_WIDTH, SAMPLE_HEIGHT, tone);
      tone = next;
      handlers.current.onFrame({ t: (captureTime ?? now) / 1000, ...reading });
      schedule();
    };

    // One read per new camera frame where the browser can say when one arrives.
    const schedule = () => {
      if (stopped) return;
      if ('requestVideoFrameCallback' in video) {
        frameHandle = video.requestVideoFrameCallback((now, meta) => read(now, meta.captureTime));
      } else {
        frameHandle = requestAnimationFrame((now) => read(now));
      }
    };

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } },
        audio: false,
      })
      .then(
        (media) => {
          if (stopped) {
            media.getTracks().forEach((track) => track.stop());
            return;
          }
          stream = media;
          video.srcObject = media;
          void video.play().catch(() => undefined);
          schedule();
        },
        () => handlers.current.onError('Allow the camera in your browser to scan your face.'),
      );

    return () => {
      stopped = true;
      if ('cancelVideoFrameCallback' in video) video.cancelVideoFrameCallback(frameHandle);
      cancelAnimationFrame(frameHandle);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    };
  }, [active]);

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      autoPlay
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        // A mirror, as people expect to see themselves.
        transform: 'scaleX(-1)',
      }}
    />
  );
}
