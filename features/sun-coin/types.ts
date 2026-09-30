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

export const sunCoinWalletSchema = z.object({
  balance: z.number().int().nonnegative().safe(),
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
export type SunCoinWallet = z.infer<typeof sunCoinWalletSchema>;

const TRANSACTION_LABELS: Record<string, string> = {
  PURCHASE: 'SUN Coin xaridi',
  GAME_REWARD: 'O‘yin mukofoti',
  ADMIN_BONUS: 'SUN MEDIA bonusi',
  GAME_SPEND: 'Qo‘shimcha o‘yin urinishi',
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
