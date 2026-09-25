import { z } from 'zod';

import { zNullableNumber, zNullableString } from '@/lib/schemas';
import { getSupabase } from '@/lib/supabase';

const zAssignee = z.object({ user_id: z.string(), full_name: z.string(), avatar_url: zNullableString });

export const commandCenterSchema = z.object({
  date: z.string(),
  tasks: z.object({ total: z.number(), completed: z.number(), in_progress: z.number(), todo: z.number(), overdue: z.number() }),
  shootings: z.array(
    z.object({
      id: z.string(),
      starts_at: z.string(),
      ends_at: z.string(),
      title: z.string(),
      status: z.string(),
      client_id: z.string(),
      client_name: z.string(),
      location_name: zNullableString,
      location_address: zNullableString,
      members: z.array(
        z.object({ user_id: z.string(), full_name: z.string(), avatar_url: zNullableString, role: zNullableString, attendance: zNullableString }),
      ),
    }),
  ),
  attendance: z.object({
    employees: z.number(),
    present: z.number(),
    late: z.number(),
    absent: z.number(),
    excused: z.number(),
    vacation: z.number(),
    remote: z.number(),
    unmarked: z.number(),
    people: z.array(
      z.object({
        user_id: z.string(),
        full_name: z.string(),
        avatar_url: zNullableString,
        job_title: zNullableString,
        status: zNullableString,
        late_minutes: zNullableNumber,
        arrived_at: zNullableString,
      }),
    ),
  }),
  approvals: z.object({
    client_review: z.number(),
    internal_review: z.number(),
    revision: z.number(),
    items: z.array(
      z.object({
        content_id: z.string(),
        label: z.string(),
        title: z.string(),
        status: z.string(),
        content_type: z.string(),
        client_name: z.string(),
        since: z.string(),
        due_at: zNullableString,
      }),
    ),
  }),
  deadlines: z.object({
    overdue: z.number(),
    critical: z.number(),
    upcoming: z.number(),
    items: z.array(
      z.object({
        task_id: z.string(),
        title: z.string(),
        task_type: z.string(),
        due_at: z.string(),
        client_name: zNullableString,
        content_id: zNullableString,
        state: z.enum(['overdue', 'critical', 'upcoming']),
        assignees: z.array(zAssignee),
      }),
    ),
  }),
  publications: z.object({
    scheduled: z.number(),
    published: z.number(),
    delayed: z.number(),
    failed: z.number(),
    items: z.array(
      z.object({
        publication_id: z.string(),
        content_id: z.string(),
        label: z.string(),
        platform: z.string(),
        scheduled_at: z.string(),
        status: z.string(),
        client_name: z.string(),
        delayed: z.boolean(),
      }),
    ),
  }),
  clients: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      logo_url: zNullableString,
      status: z.string(),
      active_projects: z.number(),
      in_production: z.number(),
      waiting_approval: z.number(),
      overdue_tasks: z.number(),
      today_events: z.number(),
    }),
  ),
  activity_today: z.number(),
});

export type CommandCenter = z.infer<typeof commandCenterSchema>;

export async function fetchCommandCenter(dateKey: string): Promise<CommandCenter> {
  const { data, error } = await getSupabase().rpc('get_command_center', { p_date: dateKey });
  if (error) throw error;
  return commandCenterSchema.parse(data);
}

export type ActivityItem = {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_avatar: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  client_id: string | null;
  client_name: string | null;
  label: string | null;
  subject_name: string | null;
  changes: { status?: string; old_status?: string; late_minutes?: number; title?: string };
};

export async function fetchActivity(params: { limit?: number; before?: number; clientId?: string } = {}): Promise<ActivityItem[]> {
  const { data, error } = await getSupabase().rpc('get_activity_feed', {
    p_limit: params.limit ?? 30,
    p_before: params.before,
    p_client_id: params.clientId,
  });
  if (error) throw error;
  return (data ?? []) as ActivityItem[];
}
