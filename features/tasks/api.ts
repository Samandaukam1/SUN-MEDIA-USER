import { z } from 'zod';

import { UserFacingError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database';

type Enums = Database['public']['Enums'];
export type TaskStatus = Enums['task_status'];
export type TaskType = Enums['task_type'];

const PERSON = 'id, full_name, avatar_url';
export const OPEN_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'revision'];

export type TaskFilters = {
  scope: 'mine' | 'all';
  userId: string;
  statuses?: TaskStatus[];
  overdue?: boolean;
  search?: string;
  sort?: 'deadline' | 'priority' | 'newest';
};

export const TASK_PAGE = 30;

export async function fetchTasks(f: TaskFilters, page: number) {
  const select = [
    `id, title, task_type, status, priority, due_at, starts_at, completed_at, created_at,
     client:clients(id, name, code),
     content:content_items!tasks_content_id_client_id_fkey(id, title),
     assignees:task_assignments(person:profiles!task_assignments_user_id_fkey(${PERSON})),
     checklist:task_checklist_items(is_done)`,
    f.scope === 'mine' ? 'mine:task_assignments!inner(user_id)' : null,
  ]
    .filter(Boolean)
    .join(',\n');
  let query = getSupabase().from('tasks').select(select).is('deleted_at', null);
  if (f.scope === 'mine') query = query.eq('mine.user_id', f.userId);
  if (f.statuses?.length) query = query.in('status', f.statuses);
  if (f.overdue) query = query.lt('due_at', new Date().toISOString()).in('status', OPEN_STATUSES);
  const term = f.search?.trim();
  if (term) query = query.ilike('title', `%${term.replace(/[%_\\]/g, '\\$&')}%`);
  if (f.sort === 'priority') query = query.order('priority', { ascending: false }).order('due_at', { ascending: true, nullsFirst: false });
  else if (f.sort === 'newest') query = query.order('created_at', { ascending: false });
  else query = query.order('due_at', { ascending: true, nullsFirst: false });
  const { data, error } = await query.order('id').range(page * TASK_PAGE, page * TASK_PAGE + TASK_PAGE - 1);
  if (error) throw error;
  return data as unknown as TaskListItem[];
}

export type TaskListItem = {
  id: string;
  title: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: Enums['priority_level'];
  due_at: string | null;
  starts_at: string | null;
  completed_at: string | null;
  created_at: string;
  client: { id: string; name: string; code: string } | null;
  content: { id: string; title: string } | null;
  assignees: { person: { id: string; full_name: string; avatar_url: string | null } | null }[];
  checklist: { is_done: boolean }[];
};

export async function fetchTask(id: string) {
  const supabase = getSupabase();
  const [task, deps, comments, files] = await Promise.all([
    supabase
      .from('tasks')
      .select(
        `id, title, description, task_type, status, priority, starts_at, due_at, started_at, completed_at, overdue_at,
         estimated_minutes, created_at, client_id, project_id, content_id, shooting_id,
         client:clients(id, name, code),
         project:projects!tasks_project_id_client_id_fkey(id, name),
         content:content_items!tasks_content_id_client_id_fkey(id, title, status),
         shooting:shootings!tasks_shooting_id_client_id_fkey(id, title, starts_at),
         creator:profiles!tasks_created_by_fkey(${PERSON}),
         assignees:task_assignments(person:profiles!task_assignments_user_id_fkey(${PERSON})),
         checklist:task_checklist_items(id, title, is_done, position, done_at, done_by)`,
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single(),
    supabase.from('task_dependencies').select('depends_on, task:tasks!task_dependencies_depends_on_fkey(id, title, status, due_at)').eq('task_id', id),
    supabase
      .from('task_comments')
      .select(`id, body, created_at, author:profiles!task_comments_author_id_fkey(${PERSON})`)
      .eq('task_id', id)
      .order('created_at'),
    supabase.from('files').select('id, name, kind, size_bytes, bucket, storage_path, external_url, created_at').eq('task_id', id).eq('status', 'uploaded').is('deleted_at', null),
  ]);
  if (task.error) throw task.error;
  if (deps.error) throw deps.error;
  if (comments.error) throw comments.error;
  if (files.error) throw files.error;
  return {
    ...task.data,
    checklist: [...task.data.checklist].sort((a, b) => a.position - b.position),
    dependencies: deps.data.map((d) => d.task).filter((t): t is NonNullable<typeof t> => !!t),
    comments: comments.data,
    files: files.data,
  };
}
export type TaskDetail = Awaited<ReturnType<typeof fetchTask>>;

export async function setTaskStatus(id: string, status: TaskStatus) {
  const { data, error } = await getSupabase().from('tasks').update({ status }).eq('id', id).select('id');
  if (error) throw error;
  if (!data?.length) throw Object.assign(new Error('forbidden'), { code: '42501' });
}

export async function setChecklistItem(itemId: string, isDone: boolean) {
  const { error } = await getSupabase().from('task_checklist_items').update({ is_done: isDone }).eq('id', itemId);
  if (error) throw error;
}

export async function addTaskComment(taskId: string, authorId: string, body: string) {
  const text = body.trim();
  if (!text) throw new UserFacingError('Izoh matnini yozing.');
  const { error } = await getSupabase().from('task_comments').insert({ task_id: taskId, author_id: authorId, body: text.slice(0, 4000) });
  if (error) throw error;
}

/** Active deadline rules for tasks: shows the assignee when they will be reminded. */
export async function fetchTaskAlertRules() {
  const { data, error } = await getSupabase()
    .from('deadline_alert_rules')
    .select('id, name, offset_minutes, recipients, task_types, is_active')
    .eq('target', 'task')
    .eq('is_active', true)
    .order('offset_minutes');
  if (error) throw error;
  return data;
}

export async function fetchTaskFormOptions(clientId: string | null) {
  const supabase = getSupabase();
  const [clients, projects, content, tasks] = await Promise.all([
    supabase.from('clients').select('id, name, code').is('deleted_at', null).in('status', ['active', 'paused']).order('name'),
    clientId ? supabase.from('projects').select('id, name').eq('client_id', clientId).is('deleted_at', null).in('status', ['planning', 'active', 'on_hold']).order('name') : Promise.resolve({ data: [], error: null }),
    clientId
      ? supabase.from('content_items').select('id, title, number, content_type').eq('client_id', clientId).is('deleted_at', null).not('status', 'in', '(published,cancelled)').order('created_at', { ascending: false }).limit(50)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('tasks').select('id, title, status').is('deleted_at', null).in('status', OPEN_STATUSES).order('due_at', { ascending: true, nullsFirst: false }).limit(60),
  ]);
  for (const r of [clients, projects, content, tasks]) if (r.error) throw r.error;
  return { clients: clients.data ?? [], projects: projects.data ?? [], content: content.data ?? [], tasks: tasks.data ?? [] };
}

export const taskFormSchema = z
  .object({
    client_id: z.uuid().nullable(),
    project_id: z.uuid().nullable(),
    content_id: z.uuid().nullable(),
    title: z.string().trim().min(1, 'Vazifa nomini yozing').max(200),
    description: z.string().max(4000),
    task_type: z.enum(['shooting', 'editing', 'design', 'copywriting', 'publishing', 'review', 'strategy', 'meeting', 'other']),
    priority: z.enum(['low', 'normal', 'high', 'urgent']),
    status: z.enum(['todo', 'in_progress', 'in_review', 'revision', 'done', 'cancelled']).optional(),
    starts_at: z.string().nullable(),
    due_at: z.string().nullable(),
    assignees: z.array(z.uuid()).min(1, 'Kamida bitta mas’ul xodimni tanlang'),
    checklist: z.array(z.object({ id: z.uuid().optional(), title: z.string().trim().min(1).max(200), is_done: z.boolean() })).max(50),
    depends_on: z.array(z.uuid()),
  })
  .refine((v) => !v.starts_at || !v.due_at || v.due_at >= v.starts_at, { path: ['due_at'], message: 'Muddat boshlanishidan keyin bo‘lsin' });
export type TaskForm = z.infer<typeof taskFormSchema>;

export async function saveTask(id: string | null, form: TaskForm): Promise<string> {
  const payload = { ...form, client_id: id ? undefined : form.client_id };
  const { data, error } = await getSupabase().rpc('save_task', { p_task_id: (id ?? null) as unknown as string, p_payload: payload as unknown as Json });
  if (error) throw error;
  return data as string;
}
