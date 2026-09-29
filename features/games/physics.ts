// Closed-form game motion. The SAME formulas run in the database (private.game_judge), which alone decides a hit;
// the app uses them only to draw. Coordinates are normalised: x ∈ [0, 1] across the field, level ∈ [0, 1.25].

export type CatchParams = { pc: number; ac: number; pa: number; aa: number; t: number; r: number; a2: number; p2: number; fc: number; fa: number; limit_ms: number };
export type PourParams = { tf: number; k: number; w: number; c: number; ab: number; pb: number; fb: number; limit_ms: number };

const TAU = 2 * Math.PI;

/** Where the egg would land if tapped at `t` seconds (aim), and where the chicken is at `t`. */
export function aimX(p: CatchParams, t: number): number {
  return 0.5 + p.aa * Math.sin((TAU * t) / p.pa + p.fa);
}

export function chickenX(p: CatchParams, t: number): number {
  return 0.5 + p.ac * Math.sin((TAU * t) / p.pc + p.fc) + p.a2 * Math.sin((TAU * t) / p.p2);
}

/** The egg flies for p.t seconds: it is caught if the chicken is within r when it arrives. */
export function catchHit(p: CatchParams, t: number): boolean {
  return Math.abs(aimX(p, t) - chickenX(p, t + p.t)) <= p.r;
}

export function pourLevel(p: PourParams, t: number): number {
  return Math.pow(Math.max(t, 0) / p.tf, p.k);
}

export function pourCentre(p: PourParams, t: number): number {
  return p.c + p.ab * Math.sin((TAU * t) / p.pb + p.fb);
}

/** Seconds until the glass overflows (the attempt ends as a miss). */
export function pourOverflowAt(p: PourParams): number {
  return p.tf * Math.pow(1.25, 1 / p.k);
}

export const DIFFICULTY_LABEL: Record<string, string> = { easy: 'Oson', normal: 'O‘rtacha', hard: 'Qiyin', extreme: 'Juda qiyin' };
