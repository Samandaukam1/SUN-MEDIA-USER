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

export async function fetchEmployeeToday(userId: string, dateKey: string) {
  const supabase = getSupabase();
  const { from, to } = agencyDayRange(dateKey);

  const [shootingsRes, tasksRes] = await Promise.all([
    supabase
      .from('shootings')
      .select(
        `id, title, starts_at, ends_at, location_name, location_address, status,
         client:clients(id, name, code),
         mine:shooting_members!inner(user_id, role)`,
      )
      .eq('mine.user_id', userId)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .gte('starts_at', from)
      .lt('starts_at', to)
      .order('starts_at'),
    supabase
      .from('tasks')
      .select(
        `id, title, task_type, status, priority, due_at, overdue_at,
         client:clients(id, name, code),
         content:content_items(id, title, content_type, number, revision_count),
         mine:task_assignments!inner(user_id)`,
      )
      .eq('mine.user_id', userId)
      .is('deleted_at', null)
      .not('status', 'in', '(done,cancelled)')
      .order('due_at', { ascending: true, nullsFirst: false })
      .limit(50),
  ]);
  if (shootingsRes.error) throw shootingsRes.error;
  if (tasksRes.error) throw tasksRes.error;
  return { shootings: shootingsRes.data, tasks: tasksRes.data };
}

export type EmployeeToday = Awaited<ReturnType<typeof fetchEmployeeToday>>;
export type MyTask = EmployeeToday['tasks'][number];
