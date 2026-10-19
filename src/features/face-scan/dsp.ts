/**
 * The face scan’s signal processing, all on the phone: the colour of the skin in the face oval,
 * sampled about 30 times a second, becomes a pulse wave by remote photoplethysmography (rPPG,
 * the POS method of Wang et al. 2017), and the pulse wave becomes vitals. Ported from the scan on
 * cloudspital.ai (heart rate), with breathing rate and heart rate variability added.
 *
 * Every vital has a quality gate: when the signal can't support a number, the scan leaves it out
 * rather than guess.
 */

/** One camera frame: the mean colour of the skin in the face regions, at time `t` in seconds. */
export type Sample = { t: number; r: number; g: number; b: number };

export type Analysis =
  | {
      ok: true;
      heartRate: number;
      /** Breaths a minute; absent when the breathing sources don't agree. */
      breathingRate?: number;
      /** RMSSD in milliseconds; absent when too few clean beats were found. */
      hrv?: number;
      quality: 'good' | 'fair';
      /** Seconds of signal analysed. */
      seconds: number;
    }
  | { ok: false; why: 'short' | 'noisy' };

/** Everything is resampled to this rate, so frame timing jitter doesn't matter. */
const FS = 30;

function fft(re: Float64Array, im: Float64Array, inverse: boolean) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let ur = 1;
      let ui = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = a + half;
        const xr = re[b]! * ur - im[b]! * ui;
        const xi = re[b]! * ui + im[b]! * ur;
        re[b] = re[a]! - xr;
        im[b] = im[a]! - xi;
        re[a] = re[a]! + xr;
        im[a] = im[a]! + xi;
        const next = ur * wr - ui * wi;
        ui = ur * wi + ui * wr;
        ur = next;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] = re[i]! / n;
      im[i] = im[i]! / n;
    }
  }
}

const nextPow2 = (n: number) => {
  let size = 1;
  while (size < n) size <<= 1;
  return size;
};

const mean = (x: ArrayLike<number>) => {
  let sum = 0;
  for (let i = 0; i < x.length; i++) sum += x[i]!;
  return x.length ? sum / x.length : 0;
};

const median = (x: number[]) => {
  const sorted = [...x].sort((a, b) => a - b);
  return sorted[sorted.length >> 1]!;
};

/** Evenly spaced samples of each colour channel at `fs`, from `from` to `to` seconds. */
function resample(samples: Sample[], fs: number, from: number, to: number) {
  const n = Math.floor((to - from) * fs);
  const R = new Float64Array(n);
  const G = new Float64Array(n);
  const B = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = from + i / fs;
    while (j < samples.length - 2 && samples[j + 1]!.t < t) j++;
    const a = samples[j]!;
    const b = samples[j + 1] ?? a;
    const w = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
    R[i] = a.r + (b.r - a.r) * w;
    G[i] = a.g + (b.g - a.g) * w;
    B[i] = a.b + (b.b - a.b) * w;
  }
  return [R, G, B] as const;
}

/**
 * Plane-orthogonal-to-skin: in short overlapping windows, normalises each channel and projects
 * onto the plane where blood volume changes show but changes in overall light and skin tone don't.
 */
function pos(R: Float64Array, G: Float64Array, B: Float64Array, fs: number) {
  const n = R.length;
  const l = Math.round(1.6 * fs);
  const H = new Float64Array(n);
  const s1 = new Float64Array(l);
  const s2 = new Float64Array(l);
  for (let t = 0; t + l <= n; t++) {
    let mr = 0;
    let mg = 0;
    let mb = 0;
    for (let k = 0; k < l; k++) {
      mr += R[t + k]!;
      mg += G[t + k]!;
      mb += B[t + k]!;
    }
    mr /= l;
    mg /= l;
    mb /= l;
    if (!mr || !mg || !mb) continue;
    let a1 = 0;
    let a2 = 0;
    for (let k = 0; k < l; k++) {
      const rn = R[t + k]! / mr;
      const gn = G[t + k]! / mg;
      const bn = B[t + k]! / mb;
      s1[k] = gn - bn;
      s2[k] = gn + bn - 2 * rn;
      a1 += s1[k]!;
      a2 += s2[k]!;
    }
    a1 /= l;
    a2 /= l;
    let v1 = 0;
    let v2 = 0;
    for (let k = 0; k < l; k++) {
      v1 += (s1[k]! - a1) ** 2;
      v2 += (s2[k]! - a2) ** 2;
    }
    const alpha = v2 > 0 ? Math.sqrt(v1 / v2) : 0;
    let hm = 0;
    for (let k = 0; k < l; k++) hm += s1[k]! + alpha * s2[k]!;
    hm /= l;
    for (let k = 0; k < l; k++) H[t + k] = H[t + k]! + s1[k]! + alpha * s2[k]! - hm;
  }
  return H;
}

/** Takes out slow drift with a moving average about `seconds` long. */
function detrend(x: Float64Array, fs: number, seconds = 1.2) {
  const n = x.length;
  const w = Math.max(3, Math.round(fs * seconds));
  const out = new Float64Array(n);
  const sums = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) sums[i + 1] = sums[i]! + x[i]!;
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - (w >> 1));
    const b = Math.min(n, i + (w >> 1) + 1);
    out[i] = x[i]! - (sums[b]! - sums[a]!) / (b - a);
  }
  return out;
}

function bandpass(x: Float64Array, fs: number, lo: number, hi: number) {
  const n = x.length;
  const size = nextPow2(n);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const m = mean(x);
  for (let i = 0; i < n; i++) re[i] = x[i]! - m;
  fft(re, im, false);
  for (let i = 0; i < size; i++) {
    const f = ((i <= size / 2 ? i : size - i) * fs) / size;
    if (f < lo || f > hi) {
      re[i] = 0;
      im[i] = 0;
    }
  }
  fft(re, im, true);
  return re.subarray(0, n);
}

type Peak = { f: number; snr: number };

/**
 * The strongest frequency between `lo` and `hi` Hz (Hann window, zero-padded to `size`, refined
 * between bins), and how far it stands out: power within `width` Hz of it (and of its first
 * harmonic, for a pulse) against the rest of `band`, in dB.
 */
function peak(
  x: ArrayLike<number>,
  fs: number,
  size: number,
  lo: number,
  hi: number,
  band: [number, number],
  width: number,
  harmonic: boolean,
): Peak {
  const n = x.length;
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const m = mean(x);
  for (let i = 0; i < n; i++) re[i] = (x[i]! - m) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  fft(re, im, false);
  const df = fs / size;
  const power = new Float64Array(size / 2);
  for (let i = 0; i < size / 2; i++) power[i] = re[i]! ** 2 + im[i]! ** 2;
  const a0 = Math.max(1, Math.ceil(lo / df));
  const b0 = Math.min(size / 2 - 2, Math.floor(hi / df));
  let k = a0;
  for (let i = a0; i <= b0; i++) if (power[i]! > power[k]!) k = i;
  const A = power[k - 1]!;
  const Bv = power[k]!;
  const C = power[k + 1]!;
  const den = A - 2 * Bv + C;
  const f = (k + (den < 0 ? (0.5 * (A - C)) / den : 0)) * df;
  let signal = 0;
  let noise = 0;
  for (let i = Math.ceil(band[0] / df); i <= Math.floor(band[1] / df); i++) {
    const fi = i * df;
    if (Math.abs(fi - f) <= width || (harmonic && Math.abs(fi - 2 * f) <= width * 1.7)) {
      signal += power[i]!;
    } else noise += power[i]!;
  }
  return { f, snr: 10 * Math.log10((signal + 1e-12) / (noise + 1e-12)) };
}

const pulsePeak = (x: ArrayLike<number>, size: number, lo: number, hi: number) =>
  peak(x, FS, size, lo, hi, [0.7, 4], 0.12, true);

/** Follows the pulse in 8-second windows: a real pulse stays put, noise wanders. */
function track(H: Float64Array) {
  const L = Math.round(8 * FS);
  const peaks: number[] = [];
  for (let i = 0; i + L <= H.length; i += FS) peaks.push(pulsePeak(H.subarray(i, i + L), 1024, 0.75, 3).f * 60);
  if (!peaks.length) return null;
  let best = peaks[0]!;
  let bestCount = -1;
  for (const candidate of peaks) {
    const count = peaks.filter((p) => Math.abs(p - candidate) <= 5).length;
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  const near = peaks.filter((p) => Math.abs(p - best) <= 7);
  const centre = median(near);
  const refined = pulsePeak(H, 4096, Math.max(0.75, (centre - 6) / 60), Math.min(3, (centre + 6) / 60));
  const overall = pulsePeak(H, 4096, 0.75, 3);
  return { heartRate: refined.f * 60, snr: overall.snr, consistency: near.length / peaks.length };
}

/**
 * The beats in a pulse wave, from its phase: the wave is narrowed around the heart rate and made
 * analytic (Hilbert transform), so each beat is where the phase completes another turn, timed
 * between samples, with the wave's envelope there as the beat's strength. Far steadier than
 * picking peaks in a noisy wave, which matters when frames are 33 ms apart.
 */
function beats(H: Float64Array, heartRate: number) {
  const hz = heartRate / 60;
  const wave = bandpass(H, FS, Math.max(0.6, hz - 0.55), hz + 0.55);
  const n = wave.length;
  const size = nextPow2(n);
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  for (let i = 0; i < n; i++) re[i] = wave[i]!;
  fft(re, im, false);
  // Keep positive frequencies only, doubled: the inverse is the analytic signal.
  for (let i = 1; i < size / 2; i++) {
    re[i] = re[i]! * 2;
    im[i] = im[i]! * 2;
  }
  for (let i = size / 2 + 1; i < size; i++) {
    re[i] = 0;
    im[i] = 0;
  }
  fft(re, im, true);

  const found: { t: number; amplitude: number }[] = [];
  // The filter rings at the ends, so the first and last second are left out.
  const edge = FS;
  let unwrapped = Math.atan2(im[edge]!, re[edge]!);
  let previous = unwrapped;
  let turns = Math.floor(unwrapped / (2 * Math.PI));
  for (let i = edge + 1; i < n - edge; i++) {
    const raw = Math.atan2(im[i]!, re[i]!);
    let step = raw - (previous % (2 * Math.PI));
    if (step > Math.PI) step -= 2 * Math.PI;
    if (step < -Math.PI) step += 2 * Math.PI;
    const before = previous;
    previous = before + step;
    unwrapped = previous;
    const target = (turns + 1) * 2 * Math.PI;
    if (unwrapped >= target && before < target && step > 0) {
      const t = (i - 1 + (target - before) / step) / FS;
      found.push({ t, amplitude: Math.hypot(re[i]!, im[i]!) });
      turns++;
    } else if (unwrapped >= target) {
      turns = Math.floor(unwrapped / (2 * Math.PI));
    }
  }
  return found;
}

/** Beat-to-beat intervals in ms, each marked clean if it is near the usual interval. */
function intervals(beatTimes: number[], heartRate: number) {
  const expected = 60_000 / heartRate;
  const ibis = [];
  for (let i = 1; i < beatTimes.length; i++) {
    const ms = (beatTimes[i]! - beatTimes[i - 1]!) * 1000;
    ibis.push({ t: beatTimes[i]!, ms, clean: Math.abs(ms - expected) <= expected * 0.25 });
  }
  return ibis;
}

/**
 * RMSSD from the clean beats: the root mean square of the change from one beat to the next.
 * Camera frames are 33 ms apart, so it needs many clean beats in a row to mean anything.
 */
function rmssd(ibis: ReturnType<typeof intervals>) {
  const clean = ibis.filter((ibi) => ibi.clean).length;
  if (ibis.length < 20 || clean / ibis.length < 0.8) return undefined;
  let sum = 0;
  let count = 0;
  for (let i = 1; i < ibis.length; i++) {
    if (!ibis[i]!.clean || !ibis[i - 1]!.clean) continue;
    sum += (ibis[i]!.ms - ibis[i - 1]!.ms) ** 2;
    count++;
  }
  if (count < 15) return undefined;
  const value = Math.sqrt(sum / count);
  return value >= 5 && value <= 200 ? Math.round(value) : undefined;
}

/** A series of (time, value) points as evenly spaced samples at `fs`, for a spectrum. */
function evenly(points: { t: number; v: number }[], fs: number) {
  if (points.length < 2) return new Float64Array(0);
  const from = points[0]!.t;
  const n = Math.floor((points[points.length - 1]!.t - from) * fs);
  const out = new Float64Array(Math.max(0, n));
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = from + i / fs;
    while (j < points.length - 2 && points[j + 1]!.t < t) j++;
    const a = points[j]!;
    const b = points[j + 1]!;
    const w = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
    out[i] = a.v + (b.v - a.v) * w;
  }
  return out;
}

/** Breaths a minute between 6 and 30. */
const BREATH: [number, number] = [0.1, 0.5];

/** The breathing frequency in one source, if it stands out from the rest of the band. */
function breathPeak(x: Float64Array, fs: number) {
  if (x.length < fs * 20) return null;
  const p = peak(x, fs, nextPow2(x.length) * 8, BREATH[0], BREATH[1], [0.08, 0.7], 0.03, false);
  return p.snr > -2 ? p.f * 60 : null;
}

/**
 * Breathing shows in a camera pulse three ways: the pulse speeds up and slows down with each
 * breath, beats grow and shrink, and the light from the skin drifts. Each gives an estimate; the
 * rate is reported only when at least two agree within 3 breaths a minute.
 */
function breathing(ibis: ReturnType<typeof intervals>, found: ReturnType<typeof beats>, G: Float64Array) {
  const clean = ibis.filter((ibi) => ibi.clean);
  const fromRhythm = breathPeak(evenly(clean.map(({ t, ms }) => ({ t, v: ms })), 4), 4);
  const fromStrength = breathPeak(evenly(found.map(({ t, amplitude }) => ({ t, v: amplitude })), 4), 4);
  const g = mean(G);
  const light = G.map((v) => (g ? v / g : 0));
  const fromLight = breathPeak(bandpass(light, FS, BREATH[0], BREATH[1]), FS);

  const estimates = [fromRhythm, fromStrength, fromLight].filter((x): x is number => x !== null);
  let best: number[] = [];
  for (const candidate of estimates) {
    const agreeing = estimates.filter((x) => Math.abs(x - candidate) <= 3);
    if (agreeing.length > best.length) best = agreeing;
  }
  return best.length >= 2 ? Math.round(mean(best)) : undefined;
}

/** The vitals in a scan, or why there aren't any. */
export function analyse(samples: Sample[], strict = false): Analysis {
  if (samples.length < 60) return { ok: false, why: 'short' };
  const t0 = samples[0]!.t;
  const t1 = samples[samples.length - 1]!.t;
  if (t1 - t0 < 10) return { ok: false, why: 'short' };

  const [R, G, B] = resample(samples, FS, t0, t1);
  const H = detrend(pos(R, G, B, FS), FS);
  const tracked = track(H);
  if (!tracked) return { ok: false, why: 'short' };
  const { heartRate, snr, consistency } = tracked;
  if (consistency < (strict ? 0.67 : 0.55) || snr < -3 || heartRate < 45 || heartRate > 180) {
    return { ok: false, why: 'noisy' };
  }
  const quality = consistency >= 0.75 && snr >= -1 ? 'good' : 'fair';

  // Beats from the pulse wave, for the rhythm and its variation.
  const found = beats(H, heartRate);
  const ibis = intervals(found.map((beat) => beat.t), heartRate);
  const seconds = t1 - t0;

  return {
    ok: true,
    heartRate: Math.round(heartRate),
    breathingRate: seconds >= 25 ? breathing(ibis, found, G) : undefined,
    // Only from a very clean pulse: noise in the beat timing adds variability that isn't there
    // (in tests, below 9 dB the estimate ran 20 to 110% high; above it, within about 10%).
    hrv: quality === 'good' && snr >= 9 ? rmssd(ibis) : undefined,
    quality,
    seconds,
  };
}

/** The last ~8 seconds of pulse wave, band-passed, for the live trace during a scan. */
export function liveWave(samples: Sample[]) {
  if (samples.length < 45) return null;
  const t1 = samples[samples.length - 1]!.t;
  const t0 = Math.max(samples[0]!.t, t1 - 8);
  if (t1 - t0 < 3) return null;
  let i0 = 0;
  while (i0 < samples.length - 1 && samples[i0]!.t < t0 - 0.2) i0++;
  const [R, G, B] = resample(samples.slice(i0), FS, t0, t1);
  return bandpass(pos(R, G, B, FS), FS, 0.7, 3.5);
}
