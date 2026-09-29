import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

const planSchema = z.object({
  key: z.string(),
  name: z.string().optional(),
  price_cents: z.coerce.number().optional(),
  currency: z.string().optional(),
  interval: z.string().optional(),
});

const entitlementsSchema = z.object({
  workspace: z.object({ id: z.string(), kind: z.enum(['agency', 'client']), name: z.string(), is_internal: z.boolean() }).optional(),
  plan: planSchema,
  inherited: z.boolean().optional(),
  source: z.string().optional(),
  ends_at: z.string().nullable().optional(),
  own: z.object({ plan: z.string(), source: z.string().nullable(), ends_at: z.string().nullable() }).nullable().optional(),
  features: z.record(z.string(), z.object({ enabled: z.boolean(), limit: z.number().nullable() })),
  pro: planSchema.optional(),
});
export type Entitlements = z.infer<typeof entitlementsSchema>;

export async function fetchEntitlements(clientId?: string): Promise<Entitlements> {
  const { data, error } = await getSupabase().rpc('get_my_entitlements', { p_client: clientId });
  if (error) throw error;
  return entitlementsSchema.parse(data);
}

/** The signed-in person's SUN MEDIA plan (cached; refreshed after a promo or on focus). */
export function useEntitlements(clientId?: string) {
  return useQuery({ queryKey: ['plan', 'entitlements', clientId ?? 'me'], queryFn: () => fetchEntitlements(clientId), staleTime: 5 * 60_000 });
}

export function hasFeature(e: Entitlements | undefined, key: string): boolean {
  return !!e?.features[key]?.enabled;
}

/** NULL = unlimited; undefined while unknown. */
export function featureLimit(e: Entitlements | undefined, key: string): number | null | undefined {
  if (!e) return undefined;
  const f = e.features[key];
  return f?.enabled ? f.limit : 0;
}

export function formatPrice(cents: number | undefined, currency = 'USD'): string {
  if (cents == null) return '';
  const value = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return currency === 'USD' ? `$${value}` : `${value} ${currency}`;
}

const featureSchema = z.object({ key: z.string(), name: z.string(), description: z.string(), audience: z.string() });
export type SaasFeature = z.infer<typeof featureSchema>;

export async function fetchFeatureCatalog(): Promise<SaasFeature[]> {
  const { data, error } = await getSupabase().from('saas_features').select('key, name, description, audience').order('position');
  if (error) throw error;
  return z.array(featureSchema).parse(data);
}

const redeemSchema = z.union([
  z.object({ ok: z.literal(true), plan: z.string(), days: z.number(), ends_at: z.string(), title: z.string() }),
  z.object({ ok: z.literal(false), reason: z.enum(['invalid', 'not_eligible', 'used_up', 'already_used']) }),
]);
export type RedeemResult = z.infer<typeof redeemSchema>;

export async function redeemPromo(code: string): Promise<RedeemResult> {
  const { data, error } = await getSupabase().rpc('redeem_promo', { p_code: code });
  if (error) throw error;
  return redeemSchema.parse(data);
}

export const REDEEM_REASON: Record<Extract<RedeemResult, { ok: false }>['reason'], string> = {
  invalid: 'Bunday promo kod yo‘q yoki muddati tugagan.',
  not_eligible: 'Bu promo kod sizning akkauntingiz uchun emas.',
  used_up: 'Bu promo kodning barcha imkoniyatlari ishlatib bo‘lingan.',
  already_used: 'Siz bu promo koddan allaqachon foydalangansiz.',
};

/** "Pro’ga o‘tish" without an in-app purchase: the request reaches SUN MEDIA (Tizim egasi). */
export async function requestProUpgrade(feature?: string): Promise<void> {
  const { error } = await getSupabase().rpc('request_pro_upgrade', { p_feature: feature });
  if (error) throw error;
}
