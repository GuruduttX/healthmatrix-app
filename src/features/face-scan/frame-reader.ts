import { REFERENCE, REGIONS, TONE_MATCH, type FrameReading } from './geometry';

/** The face's skin tone in YCbCr, smoothed from frame to frame. */
export type Tone = { y: number; cb: number; cr: number };

/** How fast the tone follows the light: a little each frame, so the pixels counted don't flicker. */
const TONE_EASE = 0.15;

/** Skin in YCbCr, wide enough for every skin tone (the website's test): the first cut. */
const isSkin = (y: number, cb: number, cr: number) =>
  y > 35 && y < 250 && cb > 77 && cb < 130 && cr > 132 && cr < 178;

/**
 * One frame's reading from RGBA pixels in the 3:4 frame (the web camera; the native cameras do the
 * same steps in Swift and Kotlin):
 * 1. The face's tone: the skin in the oval's middle, averaged twice so shadows there don't drag it.
 * 2. The colour: the mean of the pixels in the oval that match that tone. Hair, beards, eyes and
 *    the background don't.
 */
export function readFrame(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  previous: Tone | null,
): { reading: Omit<FrameReading, 't'>; tone: Tone | null } {
  const at = (i: number) => {
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    return {
      r,
      g,
      b,
      y: 0.299 * r + 0.587 * g + 0.114 * b,
      cb: 128 - 0.168736 * r - 0.331264 * g + 0.5 * b,
      cr: 128 + 0.5 * r - 0.418688 * g - 0.081312 * b,
    };
  };
  const box = ([x, y, w, h]: [number, number, number, number]) => ({
    x0: Math.max(0, Math.floor(x * width)),
    x1: Math.min(width, Math.ceil((x + w) * width)),
    y0: Math.max(0, Math.floor(y * height)),
    y1: Math.min(height, Math.ceil((y + h) * height)),
  });

  // 1. The tone of the oval's middle: a mean of its skin, then again of the skin near that mean.
  const middle = box(REFERENCE);
  let total = 0;
  let skin = 0;
  let sy = 0;
  let scb = 0;
  let scr = 0;
  for (let py = middle.y0; py < middle.y1; py++) {
    for (let px = middle.x0; px < middle.x1; px++) {
      const p = at((py * width + px) * 4);
      total++;
      if (!isSkin(p.y, p.cb, p.cr)) continue;
      skin++;
      sy += p.y;
      scb += p.cb;
      scr += p.cr;
    }
  }
  let tone = previous;
  if (skin) {
    const rough = sy / skin;
    let n = 0;
    let ty = 0;
    let tcb = 0;
    let tcr = 0;
    for (let py = middle.y0; py < middle.y1; py++) {
      for (let px = middle.x0; px < middle.x1; px++) {
        const p = at((py * width + px) * 4);
        if (!isSkin(p.y, p.cb, p.cr) || Math.abs(p.y - rough) > rough * TONE_MATCH.luma) continue;
        n++;
        ty += p.y;
        tcb += p.cb;
        tcr += p.cr;
      }
    }
    const now = n ? { y: ty / n, cb: tcb / n, cr: tcr / n } : { y: rough, cb: scb / skin, cr: scr / skin };
    tone = previous
      ? {
          y: previous.y + (now.y - previous.y) * TONE_EASE,
          cb: previous.cb + (now.cb - previous.cb) * TONE_EASE,
          cr: previous.cr + (now.cr - previous.cr) * TONE_EASE,
        }
      : now;
  }

  // 2. The pixels in the oval that match the face's tone.
  let red = 0;
  let green = 0;
  let blue = 0;
  let kept = 0;
  if (tone) {
    for (const region of REGIONS) {
      const band = box(region);
      for (let py = band.y0; py < band.y1; py++) {
        for (let px = band.x0; px < band.x1; px++) {
          const p = at((py * width + px) * 4);
          if (
            !isSkin(p.y, p.cb, p.cr) ||
            Math.abs(p.y - tone.y) > tone.y * TONE_MATCH.luma ||
            Math.abs(p.cb - tone.cb) > TONE_MATCH.chroma ||
            Math.abs(p.cr - tone.cr) > TONE_MATCH.chroma
          ) {
            continue;
          }
          kept++;
          red += p.r;
          green += p.g;
          blue += p.b;
        }
      }
    }
  }

  return {
    reading: {
      r: kept ? red / kept : 0,
      g: kept ? green / kept : 0,
      b: kept ? blue / kept : 0,
      skin: total ? skin / total : 0,
      // The face's own brightness, this frame: "find more light", and movement.
      luma: skin ? sy / skin : 0,
    },
    tone,
  };
}
