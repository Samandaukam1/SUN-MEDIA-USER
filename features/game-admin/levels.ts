/**
 * SAFI Penalty's hidden levels and reward rules, for SUN MEDIA managers only. What a level means for a round (its
 * top result, the average and the whole score distribution) comes from the server, so nothing is duplicated here.
 */
export const LEVELS = [
  { key: 'easy', label: 'Oson' },
  { key: 'normal', label: 'O‘rta' },
  { key: 'hard', label: 'Qiyin' },
  { key: 'very_hard', label: 'Juda qiyin' },
  { key: 'extreme', label: 'Ekstremal' },
] as const;
export type LevelKey = (typeof LEVELS)[number]['key'];
export const LEVEL_KEYS = LEVELS.map((l) => l.key) as [LevelKey, ...LevelKey[]];

export type RewardKind = 'SUN_COIN' | 'PRO_DAYS';
export type RuleDraft = { score: number; type: RewardKind; amount: number; quantity: number | null; enabled: boolean };

/** The example SUN MEDIA starts from — every value can be changed. */
export const DEFAULT_RULES: RuleDraft[] = [
  { score: 7, type: 'SUN_COIN', amount: 3, quantity: null, enabled: true },
  { score: 8, type: 'SUN_COIN', amount: 5, quantity: null, enabled: true },
  { score: 9, type: 'PRO_DAYS', amount: 7, quantity: null, enabled: true },
  { score: 10, type: 'PRO_DAYS', amount: 30, quantity: null, enabled: true },
];

export function rewardText(rule: { type: RewardKind; amount: number }): string {
  return rule.type === 'SUN_COIN' ? `${rule.amount} SC` : `${rule.amount} kun Pro`;
}

/** What the server accepts: scores 1–10 once each, amounts from 1 (Pro up to 365 days), quantities from 1. */
export function rulesValid(rules: RuleDraft[]): boolean {
  const scores = new Set(rules.map((r) => r.score));
  return (
    rules.length > 0 &&
    rules.length <= 10 &&
    scores.size === rules.length &&
    rules.every(
      (r) =>
        Number.isInteger(r.score) && r.score >= 1 && r.score <= 10 &&
        Number.isInteger(r.amount) && r.amount >= 1 && r.amount <= (r.type === 'PRO_DAYS' ? 365 : 1_000_000) &&
        (r.quantity === null || (Number.isInteger(r.quantity) && r.quantity >= 1 && r.quantity <= 1_000_000)),
    )
  );
}

/**
 * How often a round at a level ends with each rule — the best switched-on rule its score reaches — from the level's
 * exact score distribution (`distribution[s]` = P(score = s)); stock is left out.
 */
export function ruleOdds(distribution: readonly number[], rules: readonly { score: number; enabled: boolean }[]): Map<number, number> {
  const on = [...rules].filter((r) => r.enabled).sort((a, b) => a.score - b.score);
  const odds = new Map<number, number>();
  on.forEach((rule, i) => {
    const until = i + 1 < on.length ? on[i + 1].score : 11;
    let p = 0;
    for (let s = rule.score; s < until && s < distribution.length; s++) p += distribution[s] ?? 0;
    odds.set(rule.score, p);
  });
  return odds;
}

export const percent = (p: number) => `${Math.round(p * 1000) / 10}%`;
