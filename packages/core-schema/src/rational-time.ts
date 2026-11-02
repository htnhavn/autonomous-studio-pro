/**
 * @file rational-time.ts
 * @description Frame-accurate integer rational time arithmetic (inspired by storytold/filmcraft & OpenTimelineIO).
 * Eliminates floating-point drift across long timelines and NTSC/fractional framerates (23.976, 29.97, 59.94, 60, 120).
 */

export interface RationalTime {
  /** Integer tick or frame numerator */
  readonly value: number;
  /** Timebase denominator (e.g., 24, 30, 60, 24000, 30000, or 1000000 for microseconds) */
  readonly rate: number;
}

export interface TimeRange {
  readonly startTime: RationalTime;
  readonly duration: RationalTime;
}

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x === 0 ? 1 : x;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 1;
  return Math.abs((a / gcd(a, b)) * b);
}

/**
 * Create a normalized integer RationalTime.
 */
export function createRationalTime(value: number, rate: number = 60): RationalTime {
  if (rate <= 0) {
    throw new Error(`Invalid RationalTime rate: ${rate}. Rate must be > 0.`);
  }
  return {
    value: Math.round(value),
    rate: Math.round(rate),
  };
}

/**
 * Convert seconds (float) to a frame-quantized RationalTime at target rate.
 */
export function fromSeconds(seconds: number, rate: number = 60): RationalTime {
  return createRationalTime(Math.round(seconds * rate), rate);
}

/**
 * Convert RationalTime to floating-point seconds (for WebAudio / UI display).
 */
export function toSeconds(time: RationalTime): number {
  return time.value / time.rate;
}

/**
 * Convert RationalTime to target frame index at a given timeline FPS.
 */
export function toFrames(time: RationalTime, targetRate: number): number {
  if (time.rate === targetRate) return time.value;
  return Math.round((time.value * targetRate) / time.rate);
}

/**
 * Rescale RationalTime to a new rate without precision loss where possible.
 */
export function rescaleTime(time: RationalTime, newRate: number): RationalTime {
  if (time.rate === newRate) return time;
  return createRationalTime(Math.round((time.value * newRate) / time.rate), newRate);
}

/**
 * Add two RationalTime values using their Least Common Multiple (LCM) rate.
 */
export function addTime(a: RationalTime, b: RationalTime): RationalTime {
  if (a.rate === b.rate) {
    return createRationalTime(a.value + b.value, a.rate);
  }
  const commonRate = lcm(a.rate, b.rate);
  const aScaled = Math.round((a.value * commonRate) / a.rate);
  const bScaled = Math.round((b.value * commonRate) / b.rate);
  return createRationalTime(aScaled + bScaled, commonRate);
}

/**
 * Subtract RationalTime b from a (a - b).
 */
export function subtractTime(a: RationalTime, b: RationalTime): RationalTime {
  return addTime(a, { value: -b.value, rate: b.rate });
}

/**
 * Compare two RationalTime values: returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export function compareTime(a: RationalTime, b: RationalTime): -1 | 0 | 1 {
  const lhs = a.value * b.rate;
  const rhs = b.value * a.rate;
  if (lhs < rhs) return -1;
  if (lhs > rhs) return 1;
  return 0;
}

/**
 * Compute end time (exclusive) of a TimeRange.
 */
export function rangeEndTime(range: TimeRange): RationalTime {
  return addTime(range.startTime, range.duration);
}

/**
 * Check if two TimeRanges overlap.
 */
export function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  const aEnd = rangeEndTime(a);
  const bEnd = rangeEndTime(b);
  return compareTime(a.startTime, bEnd) < 0 && compareTime(b.startTime, aEnd) < 0;
}

/**
 * Format RationalTime as SMPTE timecode `HH:MM:SS:FF`.
 */
export function toSMPTETimecode(time: RationalTime, displayFps: number = 60): string {
  const totalFrames = Math.max(0, toFrames(time, displayFps));
  const fpsInt = Math.round(displayFps);
  const frames = totalFrames % fpsInt;
  const totalSeconds = Math.floor(totalFrames / fpsInt);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

