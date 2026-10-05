/**
 * Presentation helpers for the shot: the egg's time warp (fast launch, slow approach in selective slow motion), the
 * camera pose that holds a focus point while zooming, and the catch variant the keeper's save is dressed as.
 * Presentation only: the server decides GOAL or CATCH; nothing here changes a result.
 */
export type Point = { x: number; y: number };
export type CatchVariant = "STANDARD" | "FINGERTIP" | "DOUBLE" | "LOW" | "HIGH" | "DIVING";

/** A monotone cubic (Fritsch–Carlson) through (time, progress) points: smooth speed changes, never backwards. */
export function monotoneEase(points: readonly (readonly [number, number])[]): (t: number) => number {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) slope.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) m.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  m.push(slope[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * slope[i]; m[i + 1] = k * b * slope[i]; }
  }
  return (t) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const u = (t - xs[i]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}

/** A normal shot: launched hard, a little slower as it travels away from the camera. */
export const FLIGHT_EASE = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 1.35);
/** Selective slow motion: fast out of the boot, then the last part of the approach crawls to the glove. */
export const SLOWMO_EASE = monotoneEase([[0, 0], [0.42, 0.74], [0.9, 0.965], [1, 1]]);
/** Where the slow window starts (fraction of the flight), for the audio and camera cues. */
export const SLOWMO_START = 0.42;

/**
 * Camera as scale + translation about the arena centre, chosen so `focus` stays where it is on screen while the
 * picture grows around it — the picture tracks the point without ever showing past the arena edge.
 */
export function cameraPose(scale: number, focus: Point, width: number, height: number) {
  return { scale, x: (width / 2 - focus.x) * (scale - 1), y: (height / 2 - focus.y) * (scale - 1) };
}

/** How the save is dressed, from the target geometry and the moment class. */
export function catchVariant(shotZone: number, moment: "NEAR_MISS" | "CRITICAL_SAVE" | null): CatchVariant {
  if (moment === "CRITICAL_SAVE") return "FINGERTIP";
  const col = (shotZone - 1) % 5;
  const row = Math.floor((shotZone - 1) / 5);
  if (row === 2) return "LOW";
  if (row === 0) return "HIGH";
  if (col === 2) return "DOUBLE";
  return "DIVING";
}
