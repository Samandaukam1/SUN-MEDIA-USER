/** The SAFI goalkeeper's levels: how far its dive reaches (same rule the server judges with). */
export const LEVELS = [
  { key: 'easy', label: 'Oson', reach: 0, detail: 'Faqat o‘zi sakragan zona' },
  { key: 'normal', label: 'O‘rta', reach: 1, detail: 'Qo‘shni ustunlar ham' },
  { key: 'hard', label: 'Qiyin', reach: 2, detail: 'Qo‘shni ustun va qatorlar' },
  { key: 'extreme', label: 'Juda qiyin', reach: 3, detail: '±2 ustun, ±1 qator' },
] as const;
export type LevelKey = (typeof LEVELS)[number]['key'];

/** Does a dive to `keeper` (0…14) cover `zone` (0…14)? Mirrors private.penalty_saved. */
export function covers(keeper: number, zone: number, reach: number): boolean {
  const kr = Math.floor(keeper / 5), kc = keeper % 5, zr = Math.floor(zone / 5), zc = zone % 5;
  if (reach === 0) return keeper === zone;
  if (reach === 1) return kr === zr && Math.abs(kc - zc) <= 1;
  if (reach === 2) return Math.abs(kr - zr) <= 1 && Math.abs(kc - zc) <= 1;
  return Math.abs(kr - zr) <= 1 && Math.abs(kc - zc) <= 2;
}

/** Chance the chicken saves a shot aimed at a random zone (the dive is uniform over the 15 zones). */
export function catchChance(reach: number): number {
  let saved = 0;
  for (let k = 0; k < 15; k++) for (let z = 0; z < 15; z++) if (covers(k, z, reach)) saved++;
  return saved / 225;
}

export type RewardOptionDraft = { amount: number; quantity: number | null };

/** "Maximum distribution" and "Remaining unallocated" for a SUN Coin pool (quantity-less options use the pool). */
export function poolSummary(pool: number, options: RewardOptionDraft[]) {
  const fixed = options.reduce((sum, o) => sum + o.amount * (o.quantity ?? 0), 0);
  const poolLimited = options.some((o) => o.quantity == null);
  return {
    fixed,
    poolLimited,
    maximum: poolLimited ? pool : fixed,
    unallocated: poolLimited ? null : pool - fixed,
    exceeds: fixed > pool || options.some((o) => o.amount > pool),
  };
}
