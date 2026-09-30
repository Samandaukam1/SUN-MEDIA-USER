/**
 * Real 3D turning for the keeper's artwork. The body and the head are ellipsoids round the keeper's vertical axis:
 * their outline hardly changes as they turn (round things look round from every side), while everything on their
 * surface — eyes, brows, beak, collar, shirt number, the headband knot — slides round the surface, narrows toward
 * the edge and disappears behind it. The tail, the legs and the arms sit in depth, so they swing round the body and
 * pass behind it. Every curve is sampled once on `YAW_GRID`, so the native driver plays the whole turn.
 *
 * Coordinates are the 160 × 180 artwork's: x to the right, z toward the player. Yaw is in degrees; a positive yaw
 * turns the face to the right of the screen (90 = profile, 180 = the keeper's back).
 */
export const YAW_STEP = 15;
export const YAW_GRID: readonly number[] = Array.from({ length: 720 / YAW_STEP + 1 }, (_, i) => -360 + i * YAW_STEP);
/** The vertical axis the keeper turns about. */
export const AXIS_X = 82;

const rad = (deg: number) => (deg * Math.PI) / 180;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const sample = (f: (yaw: number) => number) => YAW_GRID.map((deg) => Math.round(f(rad(deg)) * 1000) / 1000);
/** A scale never quite reaches zero (a zero scale is a degenerate transform on some platforms). */
const safeScale = (n: number) => (Math.abs(n) < 0.01 ? (n < 0 ? -0.01 : 0.01) : n);

/** Where a point (x across from the axis, z toward the player) lands once the keeper turns by `yaw` radians. */
export function turnPoint(x: number, z: number, yaw: number): { x: number; z: number } {
  return { x: x * Math.cos(yaw) + z * Math.sin(yaw), z: -x * Math.sin(yaw) + z * Math.cos(yaw) };
}

/** A horizontal cross-section: centre (art x, depth), half-width `a` across and half-depth `b` front to back. */
export type Ellipsoid = { cx: number; cz: number; a: number; b: number };

export type SurfaceTrack = { shift: number[]; scale: number[]; opacity: number[] };

/**
 * Something painted on a round part at azimuth `phi` (0 = front centre, 90 = the keeper's left side on screen
 * right, 180 = back), `lift` units out from the surface. `seenAt` is the yaw its artwork is drawn for (0 for the
 * face and the collar, 180 for the shirt number): the track slides it from there, narrows it as it turns away and
 * fades it out behind the edge.
 */
export function surfaceTrack(body: Ellipsoid, phi: number, lift = 0, seenAt: 0 | 180 = 0): SurfaceTrack {
  const p = rad(phi);
  let nx = Math.sin(p) / body.a;
  let nz = Math.cos(p) / body.b;
  const len = Math.hypot(nx, nz);
  nx /= len;
  nz /= len;
  const x = body.cx - AXIS_X + body.a * Math.sin(p) + lift * nx;
  const z = body.cz + body.b * Math.cos(p) + lift * nz;
  const home = turnPoint(x, z, rad(seenAt)).x;
  const facing = (yaw: number) => turnPoint(nx, nz, yaw).z;
  const ref = Math.max(0.2, facing(rad(seenAt)));
  return {
    shift: sample((yaw) => turnPoint(x, z, yaw).x - home),
    scale: sample((yaw) => clamp(facing(yaw) / ref, 0.01, 1.2)),
    opacity: sample((yaw) => clamp((facing(yaw) - 0.04) / 0.22, 0, 1)),
  };
}

/** A round part's outline: width relative to the front view, and the sideways shift of its centre. */
export function outlineTrack(body: Ellipsoid): { scale: number[]; shift: number[] } {
  const x = body.cx - AXIS_X;
  return {
    scale: sample((yaw) => Math.hypot(body.a * Math.cos(yaw), body.b * Math.sin(yaw)) / body.a),
    shift: sample((yaw) => turnPoint(x, body.cz, yaw).x - x),
  };
}

/** A point in depth (x from the axis, z toward the player): its sideways shift from the front view. */
export function pointShift(x: number, z: number): number[] {
  return sample((yaw) => turnPoint(x, z, yaw).x - x);
}

/** A flat part pointing along (dx, dz): its horizontal scale, negative once it points the other way on screen. */
export function directionScale(dx: number, dz: number): number[] {
  return sample((yaw) => safeScale(turnPoint(dx, dz, yaw).x / dx));
}

/**
 * A 0 / 1 switch over the yaw (which drawing layer shows a part), with its own breakpoints so the swap is instant
 * instead of a see-through cross-fade across a whole grid step.
 */
export type Step = { input: number[]; output: number[] };
function step(on: (yawDeg: number) => boolean): Step {
  let prev = on(-360) ? 1 : 0;
  const input = [-360];
  const output = [prev];
  for (let d = -359; d <= 360; d++) {
    const cur = on(d) ? 1 : 0;
    if (cur !== prev) {
      input.push(d - 0.6, d - 0.4);
      output.push(prev, cur);
      prev = cur;
    }
  }
  input.push(360);
  output.push(prev);
  return { input, output };
}

/** A switch's value at a yaw (degrees). */
export function stepValue(st: Step, yawDeg: number): number {
  let i = 0;
  while (i < st.input.length - 1 && st.input[i + 1] <= yawDeg) i++;
  return st.output[i];
}

/** 1 while a point is behind the body's centre plane by more than `margin`, else 0 — picks the drawing layer. */
export function behind(x: number, z: number, margin = 0): Step {
  return step((d) => turnPoint(x, z, rad(d)).z < -margin);
}

/** The other drawing layer. */
export function invert(st: Step): Step {
  return { input: st.input, output: st.output.map((n) => 1 - n) };
}

/** sin(yaw) as a scale: a profile feature (the side of the beak) grows as the head turns. */
export function profileScale(): number[] {
  return sample((yaw) => safeScale(Math.sin(yaw)));
}

/** How much of a profile feature shows: none from the front, all of it from the side… */
export function profileOpacity(): number[] {
  return sample((yaw) => clamp((Math.abs(Math.sin(yaw)) - 0.08) / 0.25, 0, 1));
}

/** …until it has turned behind the head (a switch, so it never shows as a see-through ghost). */
export function profileVisible(): Step {
  return step((d) => Math.cos(rad(d)) > -0.17);
}

/**
 * The arms' plane turns a little behind the body (a big flat glove seen edge-on in front of the body would give the
 * cut-out away) and catches up once the arm has gone behind the body. Degrees in, degrees out; odd and periodic.
 */
const ARM_LAG: readonly (readonly [number, number])[] = [[0, 0], [90, 50], [140, 74], [180, 180]];
export function armAngle(yawDeg: number): number {
  const sign = yawDeg < 0 ? -1 : 1;
  const a = Math.abs(yawDeg) % 360;
  const lag = (d: number) => {
    for (let i = 1; i < ARM_LAG.length; i++) {
      const [x0, y0] = ARM_LAG[i - 1];
      const [x1, y1] = ARM_LAG[i];
      if (d <= x1) return y0 + ((d - x0) / (x1 - x0)) * (y1 - y0);
    }
    return 180;
  };
  return sign * (a <= 180 ? lag(a) : 360 - lag(360 - a));
}

/**
 * An arm hanging from a shoulder `x` across and `z` in front of the axis: the plane's rotation (degrees, about the
 * axis) and the sideways shift that puts the shoulder where the turned body has it.
 */
export function armTrack(x: number, z: number): { rotate: number[]; shift: number[] } {
  return {
    rotate: YAW_GRID.map((d) => Math.round(armAngle(d) * 100) / 100),
    shift: sample((yaw) => turnPoint(x, z, yaw).x - x * Math.cos(rad(armAngle((yaw * 180) / Math.PI)))),
  };
}

/** 1 while the arm plane is turned more than `deg` away from the player — the near arm then goes behind the body. */
export function armBehind(deg: number): Step {
  return step((d) => {
    const a = Math.abs(armAngle(d)) % 360;
    return a > deg && a < 360 - deg;
  });
}

/** 1 while a flat part (a glove) shows its back to the player. */
export function backSide(): Step {
  return step((d) => Math.cos(rad(armAngle(d))) < 0);
}
