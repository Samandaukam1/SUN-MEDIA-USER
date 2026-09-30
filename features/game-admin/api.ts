import { randomUUID } from 'expo-crypto';
import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';
import type { LevelKey } from './levels';

/** Everything below is enforced by the server for coin managers (promo.manage); the app only asks. */
const n = z.number().int().nonnegative();
const optionSchema = z.object({ id: z.string(), amount: n, quantity: n.nullable(), awarded: n, weight: n, minScore: n, maxScore: n, sortOrder: n });
const campaignSchema = z.object({
  id: z.string(), gameId: z.string(), title: z.string(), status: z.enum(['draft', 'active', 'paused', 'ended']),
  totalPool: n, distributed: n, remaining: n, minimumScore: n, strategy: z.enum(['FIRST_ELIGIBLE', 'WEIGHTED_RANDOM']),
  startsAt: z.string(), endsAt: z.string().nullable(), createdAt: z.string(), totalWinners: n, options: z.array(optionSchema),
});
const packSchema = z.object({ id: z.string(), coins: n, priceCents: n, currency: z.string(), isActive: z.boolean(), sortOrder: n });
const requestSchema = z.object({
  id: z.string(), packId: z.string(), coins: n, priceCents: n, currency: z.string(),
  status: z.enum(['pending', 'fulfilled', 'rejected', 'cancelled']), note: z.string().nullable(), createdAt: z.string(),
  resolvedAt: z.string().nullable(), userName: z.string().nullable(), clientName: z.string().nullable(),
});
const dashboardSchema = z.object({
  campaigns: z.array(campaignSchema),
  analytics: z.object({ purchased: n, spent: n, rewarded: n, gifted: n.default(0), circulating: n, totalWinners: n }),
  packs: z.array(packSchema).default([]),
  purchaseRequests: z.array(requestSchema).default([]),
  settings: z.array(z.object({ gameId: z.string(), difficulty: z.enum(['easy', 'normal', 'hard', 'extreme']), updatedAt: z.string() })).default([]),
});
export type GameAdminDashboard = z.infer<typeof dashboardSchema>;
export type CoinCampaign = z.infer<typeof campaignSchema>;
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
export const setCampaignStatus = (id: string, status: 'active' | 'paused' | 'ended') => call('set_sun_coin_campaign_status', { p_campaign: id, p_status: status });
export const setLevel = (level: LevelKey) => call('set_game_center_difficulty', { p_game_key: 'safi-penalty', p_difficulty: level });
export const savePack = (pack: { id?: string; coins?: number; priceCents?: number; currency?: string; isActive?: boolean; sortOrder?: number }) => call('save_sun_coin_pack', { p_pack: pack });

export type NewCampaign = {
  title: string;
  totalPool: number;
  minimumScore: number;
  strategy: 'FIRST_ELIGIBLE' | 'WEIGHTED_RANDOM';
  status: 'active' | 'draft';
  options: { amount: number; quantity: number | null; weight: number; minScore: number; maxScore: number }[];
};
export const createCampaign = (c: NewCampaign) =>
  call('create_sun_coin_campaign', { p_config: { gameId: 'safi-penalty', startsAt: new Date().toISOString(), endsAt: null, ...c } });

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

/** Pro reward campaigns of the SAFI game (created in the panel); managers switch them on and off here. */
const proSchema = z.object({
  id: z.string(), title: z.string(), template: z.string(), is_active: z.boolean(), reward_days: n, target_score: n,
  rewards_given: n, max_rewards_total: n.nullable(), client: z.object({ name: z.string() }).nullable(),
});
export type ProCampaign = z.infer<typeof proSchema>;
export async function fetchProCampaigns(): Promise<ProCampaign[]> {
  const { data, error } = await getSupabase()
    .from('game_campaigns')
    .select('id, title, template, is_active, reward_days, target_score, rewards_given, max_rewards_total, client:clients(name)')
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return z.array(proSchema).parse(data);
}
export async function setProCampaignActive(id: string, active: boolean) {
  const { error } = await getSupabase().from('game_campaigns').update({ is_active: active }).eq('id', id);
  if (error) throw error;
}

const ERRORS: Record<string, string> = {
  COIN_INVALID_AMOUNT: 'Miqdor 1 dan 100 000 SC gacha bo‘lsin.',
  COIN_INVALID_RECIPIENT: 'Bu foydalanuvchiga SUN Coin berib bo‘lmaydi.',
  COIN_INVALID_CONFIG: 'Kampaniya sozlamalarini tekshiring.',
  COIN_CAMPAIGN_ALREADY_ACTIVE: 'Bu o‘yinda faol kampaniya bor. Avval uni pauza qiling yoki tugating.',
  COIN_INVALID_TRANSITION: 'Kampaniyani bu holatga o‘tkazib bo‘lmaydi.',
  COIN_INVALID_PACK: 'Paket ma’lumotlarini tekshiring.',
  COIN_PURCHASE_CLOSED: 'Bu so‘rov allaqachon yopilgan.',
  GAME_INVALID_LEVEL: 'Bunday daraja yo‘q.',
};
export function gameAdminError(e: unknown): string {
  return ERRORS[(e as { message?: string } | null)?.message ?? ''] ?? 'Amal bajarilmadi. Qayta urinib ko‘ring.';
}
