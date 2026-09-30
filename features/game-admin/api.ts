import { randomUUID } from 'expo-crypto';
import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';
import { LEVEL_KEYS, type LevelKey, type RuleDraft } from './levels';

/** Everything below is enforced by the server for coin managers (promo.manage); the app only asks. */
const n = z.number().int().nonnegative();
const packSchema = z.object({ id: z.string(), coins: n, priceCents: n, currency: z.string(), isActive: z.boolean(), sortOrder: n });
const requestSchema = z.object({
  id: z.string(), packId: z.string(), coins: n, priceCents: n, currency: z.string(),
  status: z.enum(['pending', 'fulfilled', 'rejected', 'cancelled']), note: z.string().nullable(), createdAt: z.string(),
  resolvedAt: z.string().nullable(), userName: z.string().nullable(), clientName: z.string().nullable(),
});
const levelSchema = z.object({ key: z.enum(LEVEL_KEYS), index: n, top: n, average: z.number(), distribution: z.array(z.number()).length(11) });
const ruleSchema = z.object({
  id: z.string(), score: n, type: z.enum(['SUN_COIN', 'PRO_DAYS']), amount: n, quantity: n.nullable(), awarded: n,
  remaining: n.nullable(), enabled: z.boolean(),
});
const rewardCampaignSchema = z.object({
  id: z.string(), gameId: z.string(), title: z.string(), status: z.enum(['draft', 'active', 'paused', 'ended']),
  startsAt: z.string(), endsAt: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(), live: z.boolean(),
  winners: n, coinsGiven: n, proDaysGiven: n, rules: z.array(ruleSchema),
});
const dashboardSchema = z.object({
  analytics: z.object({ purchased: n, spent: n, rewarded: n, gifted: n.default(0), circulating: n, totalWinners: n }),
  packs: z.array(packSchema).default([]),
  purchaseRequests: z.array(requestSchema).default([]),
  settings: z.array(z.object({ gameId: z.string(), difficulty: z.enum(LEVEL_KEYS), updatedAt: z.string() })).default([]),
  levels: z.array(levelSchema).default([]),
  rewardCampaigns: z.array(rewardCampaignSchema).default([]),
  rewardSummary: z.object({ rounds: n, coins: n, proDays: n, winners: n }).default({ rounds: 0, coins: 0, proDays: 0, winners: 0 }),
});
export type GameAdminDashboard = z.infer<typeof dashboardSchema>;
export type LevelProfile = z.infer<typeof levelSchema>;
export type RewardCampaign = z.infer<typeof rewardCampaignSchema>;
export type RewardRule = z.infer<typeof ruleSchema>;
export type CoinPurchase = z.infer<typeof requestSchema>;
export type CoinPackRow = z.infer<typeof packSchema>;

export const gameAdminKey = ['game-admin'] as const;

export async function fetchGameAdmin(): Promise<GameAdminDashboard> {
  const { data, error } = await getSupabase().rpc('get_sun_coin_admin_dashboard');
  if (error) throw error;
  return dashboardSchema.parse(data);
}

async function call(fn: string, args: Record<string, unknown>) {
  const { data, error } = await getSupabase().rpc(fn as never, args as never);
  if (error) throw error;
  return data as unknown;
}

export const confirmPurchase = (id: string) => call('fulfill_sun_coin_purchase', { p_request: id });
export const rejectPurchase = (id: string, note: string) => call('reject_sun_coin_purchase', { p_request: id, p_note: note });
export const setLevel = (level: LevelKey) => call('set_game_center_difficulty', { p_game_key: 'safi-penalty', p_difficulty: level });
export const savePack = (pack: { id?: string; coins?: number; priceCents?: number; currency?: string; isActive?: boolean; sortOrder?: number }) => call('save_sun_coin_pack', { p_pack: pack });

/** Reward rules: score → SUN Coin or days of Pro. The server applies them when a Reward Mode round ends. */
export const createRewardCampaign = (c: { title: string; status: 'active' | 'draft'; rules: RuleDraft[] }) =>
  call('create_game_reward_campaign', { p_config: { gameId: 'safi-penalty', startsAt: new Date().toISOString(), endsAt: null, ...c } });
/** Change rules in place (by score); `removed` drops rules nobody has won. Applies to rounds that end afterwards. */
export const updateRewardRules = (id: string, rules: RuleDraft[], extra: { title?: string; removed?: number[] } = {}) =>
  call('update_game_reward_campaign', {
    p_campaign: id,
    p_config: { ...(extra.title ? { title: extra.title } : {}), rules: [...rules, ...(extra.removed ?? []).map((score) => ({ score, remove: true }))] },
  });
export const setRewardCampaignStatus = (id: string, status: 'active' | 'paused' | 'ended') =>
  call('set_game_reward_campaign_status', { p_campaign: id, p_status: status });
export const ruleDraft = (r: RewardRule): RuleDraft => ({ score: r.score, type: r.type, amount: r.amount, quantity: r.quantity, enabled: r.enabled });

const recipientSchema = z.object({ userId: z.string(), name: z.string(), email: z.string().nullable(), clientName: z.string(), balance: n });
export type Recipient = z.infer<typeof recipientSchema>;
export async function searchRecipients(query: string): Promise<Recipient[]> {
  return z.array(recipientSchema).parse(await call('search_sun_coin_recipients', { p_query: query }));
}

/** One gift per tap: the request id makes a retried call idempotent on the server. */
export async function giftCoins(userId: string, amount: number, note: string, requestId = randomUUID()) {
  return z
    .object({ balance: n, duplicate: z.boolean() })
    .parse(await call('grant_sun_coin_bonus', { p_user: userId, p_amount: amount, p_note: note || null, p_request: requestId }));
}

const ERRORS: Record<string, string> = {
  COIN_INVALID_AMOUNT: 'Miqdor 1 dan 100 000 SC gacha bo‘lsin.',
  COIN_INVALID_RECIPIENT: 'Bu foydalanuvchiga SUN Coin berib bo‘lmaydi.',
  COIN_INVALID_PACK: 'Paket ma’lumotlarini tekshiring.',
  COIN_PURCHASE_CLOSED: 'Bu so‘rov allaqachon yopilgan.',
  GAME_INVALID_LEVEL: 'Bunday daraja yo‘q.',
  GAME_INVALID_REWARD_RULES: 'Qoidalarni tekshiring: gol 1–10, miqdor kamida 1, Pro 365 kungacha, soni berilganidan kam emas.',
  GAME_REWARD_CAMPAIGN_ACTIVE: 'Faol mukofot kampaniyasi bor. Avval uni pauza qiling yoki tugating.',
  GAME_REWARD_CAMPAIGN_CLOSED: 'Tugatilgan kampaniyani o‘zgartirib bo‘lmaydi.',
  GAME_REWARD_INVALID_TRANSITION: 'Kampaniyani bu holatga o‘tkazib bo‘lmaydi.',
  GAME_REWARD_RULE_IN_USE: 'Bu qoida bo‘yicha mukofot berilgan — faqat o‘chirib qo‘yish mumkin.',
};
export function gameAdminError(e: unknown): string {
  return ERRORS[(e as { message?: string } | null)?.message ?? ''] ?? 'Amal bajarilmadi. Qayta urinib ko‘ring.';
}
