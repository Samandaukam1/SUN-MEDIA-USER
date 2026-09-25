import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Enums = Database['public']['Enums'];
export type ProjectStatus = Enums['project_status'];
export type ProjectKind = Enums['project_kind'];

export type ProjectGroup = 'active' | 'completed' | 'archived';
export const GROUP_STATUSES: Record<ProjectGroup, ProjectStatus[]> = {
  active: ['planning', 'active', 'on_hold'],
  completed: ['completed'],
  archived: ['cancelled'],
};

const DONE = new Set(['approved', 'scheduled', 'published']);

export async function fetchProjects(group: ProjectGroup, search = '') {
  let query = getSupabase()
    .from('projects')
    .select(
      `id, name, kind, status, starts_on, ends_on, updated_at,
       client:clients(id, name, code, logo_url),
       members:project_members(team_role, person:profiles!project_members_user_id_fkey(id, full_name, avatar_url)),
       content:content_items(id, status, due_at, deleted_at)`,
    )
    .is('deleted_at', null)
    .in('status', GROUP_STATUSES[group])
    .order('updated_at', { ascending: false });
  const term = search.trim();
  if (term) query = query.ilike('name', `%${term.replace(/[%_\\]/g, '\\$&')}%`);
  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data.map((p) => {
    const content = p.content.filter((c) => !c.deleted_at && c.status !== 'cancelled');
    const done = content.filter((c) => DONE.has(c.status)).length;
    const next = content
      .filter((c) => !DONE.has(c.status) && c.due_at)
      .map((c) => c.due_at!)
      .sort()[0] ?? null;
    return { ...p, total: content.length, done, progress: content.length ? done / content.length : 0, nextDeadline: next };
  });
}
export type ProjectSummary = Awaited<ReturnType<typeof fetchProjects>>[number];

export async function fetchProject(id: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const [project, shootings] = await Promise.all([
    supabase
      .from('projects')
      .select(
        `id, name, description, kind, status, starts_on, ends_on, created_at, client_id,
         client:clients(id, name, code, logo_url),
         members:project_members(team_role, person:profiles!project_members_user_id_fkey(id, full_name, avatar_url))`,
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single(),
    supabase
      .from('shootings')
      .select('id, title, starts_at, ends_at, location_name, status')
      .eq('project_id', id)
      .is('deleted_at', null)
      .neq('status', 'cancelled')
      .gte('ends_at', now)
      .order('starts_at')
      .limit(10),
  ]);
  if (project.error) throw project.error;
  if (shootings.error) throw shootings.error;
  return { ...project.data, shootings: shootings.data };
}
export type ProjectDetail = Awaited<ReturnType<typeof fetchProject>>;

export const projectSchema = z
  .object({
    client_id: z.uuid('Mijozni tanlang'),
    name: z.string().trim().min(1, 'Loyiha nomini yozing').max(160, '160 belgidan oshmasin'),
    description: z.string().trim().max(10000).nullable(),
    kind: z.enum(['retainer', 'campaign', 'one_off']),
    status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
    starts_on: z.iso.date().nullable(),
    ends_on: z.iso.date().nullable(),
    members: z.array(z.object({ user_id: z.uuid(), team_role: z.enum(['account_manager', 'project_manager', 'smm_manager', 'operator', 'editor', 'designer', 'copywriter', 'assistant']) })),
  })
  .refine((v) => !v.starts_on || !v.ends_on || v.ends_on >= v.starts_on, { path: ['ends_on'], message: 'Tugash sanasi boshlanishidan oldin bo‘lmasin' });
export type ProjectInput = z.infer<typeof projectSchema>;

/** Project row via RLS (projects.manage, client scope); members are synced to the chosen set. */
export async function saveProject(id: string | null, input: ProjectInput): Promise<string> {
  const supabase = getSupabase();
  const { members, ...row } = projectSchema.parse(input);
  const saved = id
    ? await supabase.from('projects').update({ ...row, client_id: undefined }).eq('id', id).select('id').single()
    : await supabase.from('projects').insert(row).select('id').single();
  if (saved.error) throw saved.error;
  const projectId = saved.data.id;

  const current = await supabase.from('project_members').select('user_id, team_role').eq('project_id', projectId);
  if (current.error) throw current.error;
  const key = (m: { user_id: string; team_role: string }) => `${m.user_id}:${m.team_role}`;
  const wanted = new Set(members.map(key));
  const existing = new Set(current.data.map(key));
  for (const m of current.data.filter((m) => !wanted.has(key(m)))) {
    const { error } = await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', m.user_id).eq('team_role', m.team_role);
    if (error) throw error;
  }
  const toAdd = members.filter((m) => !existing.has(key(m))).map((m) => ({ ...m, project_id: projectId }));
  if (toAdd.length) {
    const { error } = await supabase.from('project_members').insert(toAdd);
    if (error) throw error;
  }
  return projectId;
}
