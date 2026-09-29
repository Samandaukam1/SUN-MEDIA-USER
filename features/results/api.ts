import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

const n = z.coerce.number().nullable();
const nullableString = z.string().nullable();

const resultsSchema = z.object({
  month: z.string(),
  client: z.object({ id: z.string(), name: z.string(), code: z.string() }),
  production: z.object({
    reels: z.coerce.number(),
    stories: z.coerce.number(),
    posts: z.coerce.number(),
    videos: z.coerce.number(),
    designs: z.coerce.number(),
    published: z.coerce.number(),
    shootings: z.coerce.number(),
  }),
  // null = no Instagram data for the month / no CRM for this client (never shown as 0).
  instagram: z
    .object({ views: n, interactions: n, reach: n, followers: n, followers_growth: n, days_with_data: z.coerce.number() })
    .nullable(),
  leads: z.object({ delivered: z.coerce.number() }).nullable(),
});
export type ClientResults = z.infer<typeof resultsSchema>;

export async function fetchClientResults(clientId: string, month?: string): Promise<ClientResults> {
  const { data, error } = await getSupabase().rpc('get_client_results', { p_client: clientId, p_month: month });
  if (error) throw error;
  return resultsSchema.parse(data);
}

const dailySchema = z.object({ date: z.string(), views: n, reach: n, interactions: n, followers: n });
const instagramSchema = z.union([
  z.object({ connected: z.literal(false) }).transform(() => null),
  z.object({
    connected: z.boolean(),
    account: z.object({ handle: z.string(), url: nullableString, last_synced_at: nullableString, sync_error: z.boolean() }),
    days: z.coerce.number(),
    history_from: nullableString,
    followers: n,
    followers_growth: n,
    growth_since: nullableString,
    reach: n,
    current: z.object({
      days_with_data: z.coerce.number(),
      views: n,
      interactions: n,
      likes: n,
      comments: n,
      shares: n,
      saves: n,
      profile_links_taps: n,
    }),
    previous: z.object({ days_with_data: z.coerce.number(), views: n, interactions: n }).nullable(),
    daily: z.array(dailySchema),
  }),
]);
export type InstagramSummary = NonNullable<z.infer<typeof instagramSchema>>;
export type InstagramDays = 7 | 30 | 90;

export async function fetchInstagramSummary(clientId: string, days: InstagramDays): Promise<InstagramSummary | null> {
  const { data, error } = await getSupabase().rpc('get_instagram_summary', { p_client: clientId, p_days: days });
  if (error) throw error;
  return instagramSchema.parse(data);
}

const mediaSchema = z.object({
  id: z.string(),
  media_type: nullableString,
  product_type: nullableString,
  permalink: nullableString,
  thumbnail_url: nullableString,
  caption: nullableString,
  posted_at: nullableString,
  views: n,
  reach: n,
  likes: n,
  comments: n,
  shares: n,
  saves: n,
  content_id: nullableString,
  content_title: nullableString,
});
export type TopMedia = z.infer<typeof mediaSchema>;

export async function fetchTopMedia(clientId: string, days: number, limit = 10): Promise<TopMedia[]> {
  const { data, error } = await getSupabase().rpc('get_top_media', { p_client: clientId, p_days: days, p_limit: limit });
  if (error) throw error;
  return z.array(mediaSchema).parse(data);
}

const range = z.object({ low: z.coerce.number(), high: z.coerce.number() });
const prices = {
  current_price: z.coerce.number().nullable().optional(),
  next_price: z.coerce.number().nullable().optional(),
  currency: z.string().optional(),
};
const forecastSchema = z.union([
  z.object({
    available: z.literal(true),
    current_plan: z.string(),
    next_plan: z.string(),
    extra_reels: z.coerce.number(),
    basis: z.object({ days: z.coerce.number(), reels: z.coerce.number(), views_30d: n }),
    views: range,
    followers: range.nullable().optional(),
    leads: range.nullable().optional(),
    ...prices,
  }),
  z.object({
    available: z.literal(false),
    reason: z.enum(['no_plan', 'top_plan', 'not_enough_data', 'no_extra_content']),
    days: z.coerce.number().optional(),
    reels: z.coerce.number().optional(),
    next_plan: z.string().optional(),
    ...prices,
  }),
]);
export type Forecast = z.infer<typeof forecastSchema>;

export async function fetchForecast(clientId: string): Promise<Forecast> {
  const { data, error } = await getSupabase().rpc('get_client_forecast', { p_client: clientId });
  if (error) throw error;
  return forecastSchema.parse(data);
}

/** "3,0 mln" / "412 ming" with a leading "+" for growth. */
export function signed(text: string, value: number | null | undefined): string {
  return value != null && value > 0 ? `+${text}` : text;
}
