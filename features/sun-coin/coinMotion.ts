/**
 * SUN Coin motion, as plain numbers (unit-tested; the component turns them into native-driver transforms).
 *
 * The coin is a real 3D object: a disc of thickness T turning about its vertical axis (perspective + rotateY).
 * Its front face sits at depth +T/2, the reverse at −T/2 and metal discs fill the thickness between them; each
 * layer shifts sideways by z·sin θ, so edge-on the layers line up into the coin's rim band. Rim and neon ride
 * on each face, turning with it; the neon also runs round the rim on its own clock, brighter at the top.
 */
export const COIN_SPIN_MS = 5200;
export const COIN_ORBIT_MS = 3400;
export const COIN_SAMPLES = 48;
export const RIM_SAMPLES = 36;
/** Coin thickness as a fraction of its diameter. */
export const COIN_THICKNESS = 0.14;

export type CoinFrame = {
  /** Rotation about the vertical axis, degrees. */
  rotateY: number;
  /** sin θ: multiplied by a layer's depth, the sideways shift that gives the coin its thickness. */
  depth: number;
  frontOpacity: number;
  backOpacity: number;
  /** Darkening of the visible face as it turns away from the viewer. */
  shade: number;
  sheen: number;
};

export function coinFrame(theta: number): CoinFrame {
  const c = Math.cos(theta);
  const front = c >= 0;
  // The light sits slightly to the upper left: the face flashes as it turns through it.
  const light = Math.max(0, Math.cos(theta - 0.55));
  return {
    rotateY: (theta * 180) / Math.PI,
    depth: Math.sin(theta),
    frontOpacity: front ? 1 : 0,
    backOpacity: front ? 0 : 1,
    shade: 0.55 * (1 - Math.abs(c)),
    sheen: 0.42 * light ** 10,
  };
}

/** One full turn sampled for Animated.interpolate (inputs 0…1). */
export function coinTable(samples = COIN_SAMPLES) {
  const input = Array.from({ length: samples + 1 }, (_, i) => i / samples);
  const frames = input.map((u) => coinFrame(u * 2 * Math.PI));
  const pick = (k: keyof CoinFrame) => frames.map((f) => f[k]);
  return { input, pick };
}

/** Depths (px) of the metal discs that make up the coin's thickness, spaced ≤ 1.4 px apart, faces excluded. */
export function coinLayers(size: number): number[] {
  const t = size * COIN_THICKNESS;
  const n = Math.min(9, Math.max(3, Math.ceil(t / 1.4)));
  return Array.from({ length: n }, (_, i) => -t / 2 + (t * (i + 1)) / (n + 1));
}

/** The rim lies on the coin's own edge: its outer diameter equals the coin's. The neon head's halo stays small. */
export function rimGeometry(size: number) {
  const width = Math.max(1.4, size * 0.055);
  return { width, radius: size / 2 - width / 2, bloom: Math.max(2.5, width * 2.2) };
}

/** Where the neon head is after a fraction u of a turn (clockwise from the top), relative to the coin centre. */
export function rimPoint(u: number, radius: number): { x: number; y: number } {
  const a = u * 2 * Math.PI;
  return { x: radius * Math.sin(a), y: -radius * Math.cos(a) };
}

/** Neon brightness along the rim: 1 at the top, ≈0.6 at the sides, ≈0.22 at the bottom. */
export function rimDepth(u: number): number {
  return 0.61 + 0.39 * Math.cos(u * 2 * Math.PI);
}

/** "03:42:18" — never negative. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Screen-reader wording, refreshed per minute rather than per second. */
export function countdownLabel(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (total === 0) return 'bir daqiqadan kam qoldi';
  return [h ? `${h} soat` : null, m ? `${m} daqiqa` : null].filter(Boolean).join(' ') + ' qoldi';
}

/** Server clock minus device clock, measured when the wallet arrived. */
export function clockOffset(serverNow: string | null | undefined, receivedAt: number): number {
  const server = serverNow ? Date.parse(serverNow) : NaN;
  return Number.isFinite(server) ? server - receivedAt : 0;
}

/** Time left until a server timestamp, read on the server's clock. */
export function remainingMs(target: string | null | undefined, offset: number, deviceNow = Date.now()): number {
  const at = target ? Date.parse(target) : NaN;
  return Number.isFinite(at) ? Math.max(0, at - (deviceNow + offset)) : 0;
}
