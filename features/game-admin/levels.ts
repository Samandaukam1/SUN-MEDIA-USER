/**
 * SAFI goalkeeper levels: how often the chicken saves (the server's private.game_center_save_chance).
 * Goals ≈ 55 / 35 / 12.5 / 1 %. Rewards are a separate system; a level only decides goal or save.
 */
export const LEVELS = [
  { key: 'easy', label: 'Oson', save: 0.45 },
  { key: 'normal', label: 'O‘rta', save: 0.65 },
  { key: 'hard', label: 'Qiyin', save: 0.875 },
  { key: 'extreme', label: 'Juda qiyin', save: 0.99 },
] as const;
export type LevelKey = (typeof LEVELS)[number]['key'];

/** "Gol ≈ 55% · tovuq ushlaydi ≈ 45%" */
export function levelOdds(key: LevelKey): { goal: number; save: number } {
  const save = LEVELS.find((l) => l.key === key)?.save ?? LEVELS[0].save;
  return { goal: Math.round((1 - save) * 1000) / 10, save: Math.round(save * 1000) / 10 };
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
