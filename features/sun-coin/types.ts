import { z } from 'zod';

export const sunCoinTransactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  amount: z.number().int().safe(),
  // Keeping unknown future categories readable lets other games use this wallet without an app update.
  type: z.string(),
  source: z.string(),
  referenceId: z.string().nullable(),
  createdAt: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});

export const purchaseRequestSchema = z.object({
  id: z.string().uuid(),
  packId: z.string().uuid(),
  coins: z.number().int().positive().safe(),
  priceCents: z.number().int().positive().safe(),
  currency: z.string(),
  status: z.enum(['pending', 'fulfilled', 'rejected', 'cancelled']),
  note: z.string().nullable(),
  createdAt: z.string(),
  resolvedAt: z.string().nullable(),
});

export const sunCoinWalletSchema = z.object({
  balance: z.number().int().nonnegative().safe(),
  /** Server clock at the moment of the answer: countdowns run on it, not on the device clock. */
  serverNow: z.string().optional(),
  pendingPurchase: purchaseRequestSchema.nullable().optional(),
  transactions: z.array(sunCoinTransactionSchema),
  attempt: z.object({
    gameId: z.string(),
    freeAvailable: z.boolean(),
    nextFreeAt: z.string().nullable(),
    cost: z.number().int().nonnegative().safe(),
    activeSession: z.object({
      sessionId: z.string().uuid(),
      gameId: z.string(),
      attempts: z.number().int().positive(),
      attemptsUsed: z.number().int().nonnegative(),
      rewardEligible: z.boolean(),
    }).passthrough().nullable(),
  }),
  campaignAvailable: z.boolean(),
  campaign: z.object({
    id: z.string().uuid(),
    title: z.string(),
    minimumScore: z.number().int(),
    strategy: z.enum(['FIRST_ELIGIBLE', 'WEIGHTED_RANDOM']),
    remaining: z.number().int().nonnegative().safe(),
    options: z.array(z.object({ amount: z.number().int().positive().safe(), minScore: z.number().int(), maxScore: z.number().int() })),
  }).nullable(),
  proCampaign: z.object({
    id: z.string().uuid(),
    title: z.string(),
    targetScore: z.number().int(),
    rewardDays: z.number().int(),
  }).nullable(),
});

export type SunCoinTransaction = z.infer<typeof sunCoinTransactionSchema>;
/** clockOffsetMs = server clock − device clock, measured when this wallet arrived. */
export type SunCoinWallet = z.infer<typeof sunCoinWalletSchema> & { clockOffsetMs?: number };
export type SunCoinPurchaseRequest = z.infer<typeof purchaseRequestSchema>;

export const coinPackSchema = z.object({
  id: z.string().uuid(),
  coins: z.number().int().positive().safe(),
  priceCents: z.number().int().positive().safe(),
  currency: z.string(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
});
export const coinShopSchema = z.object({
  packs: z.array(coinPackSchema),
  pending: purchaseRequestSchema.nullable(),
  balance: z.number().int().nonnegative().safe(),
});
export type CoinPack = z.infer<typeof coinPackSchema>;
export type CoinShop = z.infer<typeof coinShopSchema>;

/** The best price per coin — only when it is really lower than every other pack in the same currency. */
export function bestValuePackId(packs: Pick<CoinPack, 'id' | 'coins' | 'priceCents' | 'currency'>[]): string | null {
  if (packs.length < 2 || new Set(packs.map((p) => p.currency)).size !== 1) return null;
  const rates = packs.map((p) => ({ id: p.id, rate: p.priceCents / p.coins })).sort((a, b) => a.rate - b.rate);
  return rates[0].rate < rates[1].rate ? rates[0].id : null;
}

export type RewardReplay =
  | { kind: 'closed' }
  | { kind: 'free' }
  | { kind: 'paid'; cost: number; balance: number; after: number }
  | { kind: 'short'; cost: number; balance: number; missing: number };

/** What "play Reward Mode again" means right now: free, a 10 SC confirmation, a top-up, or nothing to win. */
export function rewardReplay(w: Pick<SunCoinWallet, 'balance' | 'attempt' | 'campaignAvailable'>): RewardReplay {
  if (!w.campaignAvailable) return { kind: 'closed' };
  if (w.attempt.freeAvailable) return { kind: 'free' };
  const { cost } = w.attempt;
  return w.balance >= cost
    ? { kind: 'paid', cost, balance: w.balance, after: w.balance - cost }
    : { kind: 'short', cost, balance: w.balance, missing: cost - w.balance };
}

const TRANSACTION_LABELS: Record<string, string> = {
  PURCHASE: 'SUN Coin xaridi',
  GAME_REWARD: 'O‘yin mukofoti',
  ADMIN_BONUS: 'SUN MEDIA bonusi',
  GAME_SPEND: 'Qo‘shimcha sovg‘ali urinish',
  REFUND: 'Qaytarilgan SUN Coin',
  PROMO: 'Promo mukofoti',
  ADJUSTMENT: 'Balans tuzatishi',
};

export function transactionLabel(type: string): string {
  return TRANSACTION_LABELS[type] ?? 'SUN Coin operatsiyasi';
}

/** Integer coins retain every digit, including across differing device locale settings. */
export function formatSunCoin(amount: number): string {
  return `${amount.toLocaleString('en-US').replace(/,/g, ' ')} SC`;
}

/** "SUN Coin: 1–5 SC · 5+ gol" and "Pro: 3 kun · 7+ gol" — from the live campaigns, never hardcoded. */
export function prizeLines(data: Pick<SunCoinWallet, 'campaign' | 'proCampaign'>): string[] {
  const lines: string[] = [];
  const c = data.campaign;
  if (c && c.options.length > 0) {
    const amounts = c.options.map((o) => o.amount);
    const low = Math.min(...amounts);
    const high = Math.max(...amounts);
    const minGoals = Math.min(...c.options.map((o) => Math.max(o.minScore, c.minimumScore)));
    lines.push(`SUN Coin: ${low === high ? formatSunCoin(low) : `${low}–${formatSunCoin(high)}`} · ${minGoals}+ gol`);
  }
  const pro = data.proCampaign;
  if (pro) lines.push(`Pro: ${pro.rewardDays} kun · ${pro.targetScore}+ gol`);
  return lines;
}
