import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

export async function fetchClients() {
  const { data, error } = await getSupabase().from('clients').select('id, name, code, logo_url, status, industry').is('deleted_at', null).order('name');
  if (error) throw error;
  return data;
}
export type ClientListItem = Awaited<ReturnType<typeof fetchClients>>[number];

const nullableString = z.string().nullable();
const overviewSchema = z.object({
  client: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    logo_url: nullableString,
    status: z.string(),
    industry: nullableString,
    website: nullableString,
    created_at: z.string(),
  }),
  pipeline: z.record(z.string(), z.number()),
  overdue_content: z.number(),
  waiting_client: z.object({ count: z.number(), oldest: nullableString }),
  plan: z
    .object({
      name: z.string(),
      status: z.string(),
      starts_on: z.string(),
      ends_on: z.string(),
      days_left: z.number(),
      usage: z.array(z.object({ service_name: z.string(), unit: z.string(), planned: z.number().nullable(), used: z.number() })),
    })
    .nullable(),
  plan_visible: z.boolean(),
  shootings: z.array(z.object({ id: z.string(), title: z.string(), starts_at: z.string(), location_name: nullableString, status: z.string() })),
  tasks: z.object({
    open: z.number(),
    overdue: z.number(),
    soon: z.array(z.object({ id: z.string(), title: z.string(), due_at: z.string(), status: z.string(), priority: z.string() })),
  }),
  team: z.array(z.object({ user_id: z.string(), team_role: z.string(), full_name: z.string(), avatar_url: nullableString })),
  contacts: z.array(
    z.object({
      user_id: z.string(),
      full_name: z.string(),
      role_name: nullableString,
      title: nullableString,
      phone: nullableString,
      email: nullableString,
      last_seen_at: nullableString,
    }),
  ),
  reports: z.array(z.object({ id: z.string(), period_month: z.string(), status: z.string() })),
  files: z.object({ count: z.number(), bytes: z.coerce.number() }),
  chat_room_id: nullableString,
  published_this_month: z.number(),
});
export type ClientOverview = z.infer<typeof overviewSchema>;

export async function fetchClientOverview(id: string): Promise<ClientOverview | null> {
  const { data, error } = await getSupabase().rpc('get_client_overview', { p_client_id: id });
  if (error) throw error;
  return data ? overviewSchema.parse(data) : null;
}
