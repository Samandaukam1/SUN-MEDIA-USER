import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

const status = z.enum(['scheduled', 'active', 'expired', 'cancelled']);
const nullableString = z.string().nullable();

const planSchema = z.object({
  current: z
    .object({
      id: z.string(),
      status,
      starts_on: z.string(),
      ends_on: z.string(),
      price: z.coerce.number(),
      currency: z.string(),
      days_total: z.number(),
      days_left: z.number(),
      plan: z.object({ id: z.string(), name: z.string(), description: nullableString, duration_months: z.number() }),
    })
    .nullable(),
  upcoming: z
    .object({ id: z.string(), plan_name: z.string(), starts_on: z.string(), ends_on: z.string(), price: z.coerce.number(), currency: z.string() })
    .nullable()
    .optional(),
  usage: z.array(
    z.object({
      service_key: z.string(),
      service_name: z.string(),
      unit: z.string(),
      planned: z.number().nullable(),
      used: z.number(),
      is_included: z.boolean(),
      is_quantitative: z.boolean(),
    }),
  ),
  pending_request: z.object({ id: z.string(), plan_name: z.string(), message: nullableString, created_at: z.string() }).nullable(),
  last_decision: z.object({ status: z.enum(['approved', 'rejected']), plan_name: z.string(), response: nullableString, handled_at: z.string() }).nullable(),
  plans: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: nullableString,
      price: z.coerce.number(),
      currency: z.string(),
      duration_months: z.number(),
      is_custom: z.boolean(),
      is_current: z.boolean().nullable(),
      features: z.array(z.object({ service_name: z.string(), unit: z.string(), quantity: z.number().nullable(), is_included: z.boolean(), note: nullableString })),
    }),
  ),
  history: z.array(z.object({ id: z.string(), plan_name: z.string(), status, starts_on: z.string(), ends_on: z.string() })),
});
export type ClientPlan = z.infer<typeof planSchema>;

export async function fetchClientPlan(clientId: string): Promise<ClientPlan> {
  const { data, error } = await getSupabase().rpc('get_client_plan', { p_client_id: clientId });
  if (error) throw error;
  return planSchema.parse(data);
}

export async function requestUpgrade(clientId: string, planId: string, message: string) {
  const { error } = await getSupabase()
    .from('plan_upgrade_requests')
    .insert({ client_id: clientId, requested_plan_id: planId, message: message.trim() || null });
  if (error) throw error;
}

export async function cancelUpgrade(requestId: string) {
  const { error } = await getSupabase().from('plan_upgrade_requests').update({ status: 'cancelled' }).eq('id', requestId);
  if (error) throw error;
}

/** "3 500 000 so‘m" */
export function formatMoney(amount: number, currency = 'UZS'): string {
  const whole = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return currency === 'UZS' ? `${whole} so‘m` : `${whole} ${currency}`;
}
