/**
 * The face guide, in a portrait camera frame 3 wide by 4 tall, with x and y from 0 to 1 across its
 * width and height. The camera on each platform reads the skin in `REGIONS` and the screen draws
 * `OVAL` over the same frame, so what the member lines up is what is measured. Same oval as the
 * scan on cloudspital.ai.
 */
export const FRAME_ASPECT = 3 / 4;

/** Centre and radii of the oval the face fits in. */
export const OVAL = { cx: 0.5, cy: 0.48, rx: 0.375, ry: 0.37 };

/** Bands across the oval, each as wide as the oval at its middle, less a margin at the sides. */
const BANDS = 12;
/** How much of the oval's width and height the bands cover: the edges are mostly background. */
const COVER = 0.88;

/**
 * The inside of the oval, as [x, y, width, height] bands. The camera keeps the pixels in them that
 * match the face's own skin tone (see `REFERENCE`), so the reading follows the member's actual
 * face: hair, a beard, eyes, glasses and the background drop out wherever they are. (Fixed
 * forehead and cheek boxes, as on the website, landed on hair and beards when a face didn't match
 * the drawing.)
 */
export const REGIONS: [number, number, number, number][] = Array.from({ length: BANDS }, (_, i) => {
  const top = OVAL.cy - OVAL.ry * COVER + ((2 * OVAL.ry * COVER) / BANDS) * i;
  const height = (2 * OVAL.ry * COVER) / BANDS;
  const middle = (top + height / 2 - OVAL.cy) / OVAL.ry;
  const halfWidth = OVAL.rx * COVER * Math.sqrt(Math.max(0, 1 - middle * middle));
  return [OVAL.cx - halfWidth, top, halfWidth * 2, height];
});

/** The regions as one flat list, the way the native camera views take them. */
export const REGIONS_FLAT = REGIONS.flat();

/**
 * The middle of the oval (nose and inner cheeks), which is skin for anyone lined up in it: the
 * camera takes the face's skin tone from here each frame, then keeps the pixels in `REGIONS` within
 * `TONE_MATCH` of it. The broad skin test alone also passed dark hair, beards and beige walls.
 */
export const REFERENCE: [number, number, number, number] = [0.38, 0.4, 0.24, 0.16];

/**
 * How close a pixel must be to the face's tone to count: brightness within this share of the
 * face's, and each colour difference (Cb, Cr) within this many steps. The same on every platform.
 */
export const TONE_MATCH = { luma: 0.3, chroma: 10 };

/** One frame's reading from the camera. */
export type FrameReading = {
  /** Capture time in seconds, on the camera's clock. */
  t: number;
  /** Mean colour of the skin pixels in the regions, 0 to 255. */
  r: number;
  g: number;
  b: number;
  /** Share of the oval's middle (`REFERENCE`) that looks like skin: low means no face there. */
  skin: number;
  /** The face's brightness, 0 to 255: for "find more light" and movement. */
  luma: number;
};
