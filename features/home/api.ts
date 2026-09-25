import { z } from 'zod';

import { zCalendarEvent, zNotificationPreview, zNullableNumber, zNullableString } from '@/lib/schemas';
import { getSupabase } from '@/lib/supabase';
import { agencyDayRange } from '@/lib/time';

const PERSON = 'id, full_name, avatar_url';

const CONTENT_SELECT = `id, title, content_type, status, number, due_at, client_approval_due_at, shooting_id, priority,
  team:content_assignments(role, person:profiles!content_assignments_user_id_fkey(${PERSON})),
  publications:content_publications(id, platform, scheduled_at, status)`;

const quote = (value: string) => `"${value}"`;

export async function fetchClientToday(clientId: string, dateKey: string) {
  const supabase = getSupabase();
  const { from, to } = agencyDayRange(dateKey);

  const [shootingsRes, publicationsRes] = await Promise.all([
    supabase
      .from('shootings')
      .select(
        `id, title, starts_at, ends_at, location_name, location_address, status,
         crew:shooting_members(role, person:profiles!shooting_members_user_id_fkey(${PERSON}))`,
      )
      .eq('client_id', clientId)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .gte('starts_at', from)
      .lt('starts_at', to)
      .order('starts_at'),
    supabase
      .from('content_publications')
      .select('content_id')
      .eq('client_id', clientId)
      .neq('status', 'cancelled')
      .gte('scheduled_at', from)
      .lt('scheduled_at', to),
  ]);
  if (shootingsRes.error) throw shootingsRes.error;
  if (publicationsRes.error) throw publicationsRes.error;

  const shootingIds = shootingsRes.data.map((s) => s.id);
  const publishingIds = [...new Set(publicationsRes.data.map((p) => p.content_id))];
  const conditions = [`and(due_at.gte.${quote(from)},due_at.lt.${quote(to)})`];
  if (shootingIds.length) conditions.push(`shooting_id.in.(${shootingIds.join(',')})`);
  if (publishingIds.length) conditions.push(`id.in.(${publishingIds.join(',')})`);

  const contentRes = await supabase
    .from('content_items')
    .select(CONTENT_SELECT)
    .eq('client_id', clientId)
    .is('deleted_at', null)
    .or(conditions.join(','))
    .order('due_at', { ascending: true, nullsFirst: false });
  if (contentRes.error) throw contentRes.error;

  return { shootings: shootingsRes.data, contents: contentRes.data };
}

export type ClientToday = Awaited<ReturnType<typeof fetchClientToday>>;
export type TodayShooting = ClientToday['shootings'][number];
export type TodayContent = ClientToday['contents'][number];

// ---------------------------------------------------------------------------
// Client home (get_client_home: SECURITY INVOKER, scoped by the client's RLS)
// ---------------------------------------------------------------------------
const clientHomeSchema = z.object({
  date: z.string(),
  client: z.object({ id: z.string(), name: z.string(), code: z.string(), logo_url: zNullableString, industry: zNullableString }),
  subscription: z
    .object({ id: z.string(), plan_id: z.string(), plan_name: z.string(), plan_slug: z.string(), starts_on: z.string(), ends_on: z.string(), status: z.string() })
    .nullable(),
  usage: z.array(
    z.object({
      service_key: z.string(),
      service_name: z.string(),
      unit: zNullableString,
      planned: zNullableNumber,
      used: z.number(),
      is_quantitative: z.boolean(),
      is_included: z.boolean(),
    }),
  ),
  today: z.array(zCalendarEvent),
  upcoming: z.array(zCalendarEvent),
  stats: z.object({
    in_production: z.number(),
    editing: z.number(),
    waiting_approval: z.number(),
    publishing_today: z.number(),
    published_month: z.number(),
    shootings_month: z.number(),
  }),
  month_delivered: z.record(z.string(), z.number()),
  awaiting_approval: z.array(
    z.object({
      content_id: z.string(),
      title: z.string(),
      content_type: z.string(),
      number: zNullableNumber,
      due_at: zNullableString,
      revision_count: z.number(),
      version: z.object({ id: z.string(), version_number: z.number(), sent_at: zNullableString }).nullable(),
    }),
  ),
  team: z.array(z.object({ user_id: z.string(), full_name: z.string(), avatar_url: zNullableString, team_role: z.string() })),
  notifications: z.array(zNotificationPreview),
  unread_notifications: z.number(),
});

export type ClientHome = z.infer<typeof clientHomeSchema>;

export async function fetchClientHome(clientId: string): Promise<ClientHome> {
  const { data, error } = await getSupabase().rpc('get_client_home', { p_client_id: clientId });
  if (error) throw error;
  return clientHomeSchema.parse(data);
}

// ---------------------------------------------------------------------------
// Employee home (get_employee_home: always about the signed-in employee)
// ---------------------------------------------------------------------------
const employeeHomeSchema = z.object({
  date: z.string(),
  attendance: z.object({ status: z.string(), arrived_at: zNullableString, late_minutes: zNullableNumber }).nullable(),
  task_stats: z.object({ open: z.number(), due_today: z.number(), overdue: z.number(), in_progress: z.number(), done_today: z.number() }),
  tasks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      task_type: z.string(),
      status: z.string(),
      priority: z.string(),
      due_at: zNullableString,
      client_name: zNullableString,
      client_code: zNullableString,
      content_id: zNullableString,
      content_title: zNullableString,
      content_type: zNullableString,
      revision_count: zNullableNumber,
    }),
  ),
  shootings: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      starts_at: z.string(),
      ends_at: z.string(),
      status: z.string(),
      location_name: zNullableString,
      location_address: zNullableString,
      location_url: zNullableString,
      client_name: zNullableString,
      my_role: zNullableString,
      my_attendance: zNullableString,
      crew: z.array(z.object({ user_id: z.string(), full_name: z.string(), avatar_url: zNullableString, role: zNullableString })),
      content: z.array(z.object({ id: z.string(), title: z.string(), content_type: z.string() })),
    }),
  ),
  content: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      content_type: z.string(),
      status: z.string(),
      number: zNullableNumber,
      due_at: zNullableString,
      client_name: zNullableString,
      client_code: zNullableString,
      my_role: zNullableString,
      revision_count: z.number(),
    }),
  ),
  unread_notifications: z.number(),
});

export type EmployeeHome = z.infer<typeof employeeHomeSchema>;
export type EmployeeTask = EmployeeHome['tasks'][number];

export async function fetchEmployeeHome(): Promise<EmployeeHome> {
  const { data, error } = await getSupabase().rpc('get_employee_home');
  if (error) throw error;
  return employeeHomeSchema.parse(data);
}
