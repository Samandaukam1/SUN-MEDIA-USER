import { z } from 'zod';

import { UserFacingError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database';

type Enums = Database['public']['Enums'];
export type ContentStatus = Enums['content_status'];
export type ContentType = Enums['content_type'];
export type Platform = Enums['social_platform'];
export type Priority = Enums['priority_level'];

const PERSON = 'id, full_name, avatar_url';

// ---------------------------------------------------------------------------
// Studio list
// ---------------------------------------------------------------------------
export type StudioSort = 'newest' | 'oldest' | 'deadline' | 'priority';
export type StudioFilters = {
  statuses?: ContentStatus[];
  clientId?: string | null;
  projectId?: string | null;
  type?: ContentType | null;
  platform?: Platform | null;
  employeeId?: string | null;
  overdue?: boolean;
  search?: string;
  sort?: StudioSort;
};

const LIST_SELECT = `id, number, title, content_type, status, priority, due_at, client_approval_due_at, revision_count, created_at, updated_at,
  client:clients(id, name, code),
  project:projects!content_items_project_id_client_id_fkey(id, name),
  shooting:shootings!content_items_shooting_id_client_id_fkey(id, starts_at, location_name),
  thumbnail:files!content_items_thumbnail_file_fk(bucket, storage_path, external_url),
  team:content_assignments(role, person:profiles!content_assignments_user_id_fkey(${PERSON})),
  publications:content_publications(platform, scheduled_at, status)`;

export const STUDIO_PAGE = 30;
const DONE: ContentStatus[] = ['approved', 'scheduled', 'published', 'cancelled'];

export async function fetchStudioPage(filters: StudioFilters, page: number) {
  const supabase = getSupabase();
  // Extra !inner embeds are used only to filter; the display embeds above stay complete.
  const extra = [
    filters.employeeId ? 'assignee:content_assignments!inner(user_id)' : null,
    filters.platform ? 'channel:content_publications!inner(platform)' : null,
  ].filter(Boolean);
  let query = supabase
    .from('content_items')
    .select([LIST_SELECT, ...extra].join(',\n'))
    .is('deleted_at', null);

  if (filters.statuses?.length) query = query.in('status', filters.statuses);
  if (filters.clientId) query = query.eq('client_id', filters.clientId);
  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.type) query = query.eq('content_type', filters.type);
  if (filters.employeeId) query = query.eq('assignee.user_id', filters.employeeId);
  if (filters.platform) query = query.eq('channel.platform', filters.platform);
  if (filters.overdue) query = query.lt('due_at', new Date().toISOString()).not('status', 'in', `(${DONE.join(',')})`);
  const term = filters.search?.trim();
  if (term) query = query.ilike('title', `%${term.replace(/[%_\\]/g, '\\$&')}%`);

  switch (filters.sort ?? 'newest') {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'deadline':
      query = query.order('due_at', { ascending: true, nullsFirst: false });
      break;
    case 'priority':
      query = query.order('priority', { ascending: false }).order('due_at', { ascending: true, nullsFirst: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }
  const { data, error } = await query.order('id').range(page * STUDIO_PAGE, page * STUDIO_PAGE + STUDIO_PAGE - 1);
  if (error) throw error;
  return data as unknown as StudioItem[];
}

export type StudioItem = {
  id: string;
  number: number;
  title: string;
  content_type: ContentType;
  status: ContentStatus;
  priority: Priority;
  due_at: string | null;
  client_approval_due_at: string | null;
  revision_count: number;
  created_at: string;
  updated_at: string;
  client: { id: string; name: string; code: string } | null;
  project: { id: string; name: string } | null;
  shooting: { id: string; starts_at: string; location_name: string | null } | null;
  thumbnail: { bucket: string | null; storage_path: string | null; external_url: string | null } | null;
  team: { role: Enums['team_role']; person: { id: string; full_name: string; avatar_url: string | null } | null }[];
  publications: { platform: Platform; scheduled_at: string | null; status: Enums['publication_status'] }[];
};

export function isContentOverdue(item: Pick<StudioItem, 'due_at' | 'status'>, now = Date.now()) {
  return !!item.due_at && !DONE.includes(item.status) && new Date(item.due_at).getTime() < now;
}

// ---------------------------------------------------------------------------
// Content detail
// ---------------------------------------------------------------------------
export async function fetchContent(id: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('content_items')
    .select(
      `id, number, title, content_type, status, priority, description, script, caption, hashtags, reference_links, music_reference,
       plan_month, due_at, client_approval_due_at, is_client_visible, counts_toward_plan, revision_count, status_changed_at,
       approved_at, published_at, created_at, updated_at, client_id, project_id, shooting_id,
       client:clients(id, name, code),
       project:projects!content_items_project_id_client_id_fkey(id, name),
       shooting:shootings!content_items_shooting_id_client_id_fkey(id, title, starts_at, ends_at, location_name, location_address, status),
       thumbnail:files!content_items_thumbnail_file_fk(bucket, storage_path, external_url),
       creator:profiles!content_items_created_by_fkey(full_name),
       team:content_assignments(role, person:profiles!content_assignments_user_id_fkey(${PERSON})),
       publications:content_publications(id, platform, scheduled_at, published_at, status, post_url),
       versions:content_versions(id, version_number, status, notes, submitted_at, sent_to_client_at, decided_at, file_id),
       revisions(id, revision_number, status, summary, stage, requested_at, resolved_at),
       history:content_status_history(id, from_status, to_status, changed_at, note, actor:profiles!content_status_history_changed_by_fkey(full_name))`,
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single();
  if (error) throw error;
  return data;
}
export type ContentDetail = Awaited<ReturnType<typeof fetchContent>>;

export async function fetchContentFiles(contentId: string) {
  const { data, error } = await getSupabase()
    .from('files')
    .select('id, name, kind, mime_type, size_bytes, bucket, storage_path, external_url, visibility, created_at, uploader:profiles!files_uploaded_by_fkey(full_name)')
    .eq('content_id', contentId)
    .eq('status', 'uploaded')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchTransitions(contentId: string): Promise<ContentStatus[]> {
  const { data, error } = await getSupabase().rpc('get_content_transitions', { p_content_id: contentId });
  if (error) throw error;
  return (data ?? []) as ContentStatus[];
}

export async function setContentStatus(contentId: string, status: ContentStatus, note?: string) {
  const { error } = await getSupabase().rpc('set_content_status', { p_content_id: contentId, p_status: status, p_note: note || undefined });
  if (error) throw error;
}

export async function fetchComments(contentId: string) {
  const { data, error } = await getSupabase()
    .from('content_comments')
    .select('id, body, visibility, created_at, parent_id, author:profiles!content_comments_author_id_fkey(id, full_name, avatar_url)')
    .eq('content_id', contentId)
    .is('deleted_at', null)
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function addComment(contentId: string, clientId: string, authorId: string, body: string, visibility: 'internal' | 'client') {
  const text = body.trim();
  if (!text) throw new UserFacingError('Izoh matnini yozing.');
  const { error } = await getSupabase()
    .from('content_comments')
    .insert({ content_id: contentId, client_id: clientId, author_id: authorId, body: text.slice(0, 4000), visibility });
  if (error) throw error;
}

export async function updatePublication(id: string, patch: { status?: Enums['publication_status']; scheduled_at?: string | null; post_url?: string | null }) {
  if (patch.post_url && !/^https:\/\//i.test(patch.post_url)) throw new UserFacingError('Havola https:// bilan boshlansin.');
  const { error } = await getSupabase()
    .from('content_publications')
    .update({ ...patch, ...(patch.status === 'published' ? { published_at: new Date().toISOString() } : {}) })
    .eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Create / edit
// ---------------------------------------------------------------------------
export async function fetchFormOptions(clientId: string | null) {
  const supabase = getSupabase();
  const [clients, projects, shootings] = await Promise.all([
    supabase.from('clients').select('id, name, code').is('deleted_at', null).in('status', ['active', 'paused']).order('name'),
    clientId
      ? supabase.from('projects').select('id, name, status').eq('client_id', clientId).is('deleted_at', null).in('status', ['planning', 'active', 'on_hold']).order('name')
      : Promise.resolve({ data: [], error: null }),
    clientId
      ? supabase
          .from('shootings')
          .select('id, title, starts_at, location_name')
          .eq('client_id', clientId)
          .is('deleted_at', null)
          .gte('starts_at', new Date(Date.now() - 86400000).toISOString())
          .neq('status', 'cancelled')
          .order('starts_at')
          .limit(30)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (clients.error) throw clients.error;
  if (projects.error) throw projects.error;
  if (shootings.error) throw shootings.error;
  return { clients: clients.data, projects: projects.data ?? [], shootings: shootings.data ?? [] };
}

export const TEAM_ROLES = ['operator', 'editor', 'designer', 'smm_manager', 'copywriter'] as const;
export type TeamRoleKey = (typeof TEAM_ROLES)[number];

export const contentFormSchema = z.object({
  client_id: z.uuid('Mijozni tanlang'),
  project_id: z.uuid().nullable(),
  title: z.string().trim().min(1, 'Sarlavhani yozing').max(200, '200 belgidan oshmasin'),
  content_type: z.enum(['reel', 'video', 'post', 'carousel', 'story', 'design', 'ad_creative', 'other']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  status: z.enum(['idea', 'script', 'ready_for_shoot', 'shooting', 'shot', 'editing', 'internal_review', 'client_review', 'revision', 'approved', 'scheduled', 'published', 'cancelled']).optional(),
  platforms: z.array(z.enum(['instagram', 'tiktok', 'youtube', 'facebook', 'telegram', 'linkedin', 'x', 'website', 'other'])),
  description: z.string().max(4000),
  script: z.string().max(20000),
  caption: z.string().max(4000),
  hashtags: z.array(z.string().max(80)).max(60, 'Hashtaglar 60 tadan oshmasin'),
  music_reference: z.string().max(500),
  reference_links: z.array(z.string().regex(/^https:\/\/\S+$/i, 'Referens havolalari https:// bilan boshlansin')).max(20),
  due_at: z.string().nullable(),
  client_approval_due_at: z.string().nullable(),
  publish_at: z.string().nullable(),
  is_client_visible: z.boolean(),
  counts_toward_plan: z.boolean(),
  team: z.record(z.string(), z.uuid().nullable()),
  shooting: z.discriminatedUnion('mode', [
    z.object({ mode: z.literal('keep') }),
    z.object({ mode: z.literal('none') }),
    z.object({ mode: z.literal('existing'), shooting_id: z.uuid('Syomkani tanlang') }),
    z.object({
      mode: z.literal('new'),
      starts_at: z.string(),
      ends_at: z.string(),
      location_name: z.string().max(200),
      location_address: z.string().max(300),
    }),
  ]),
});
export type ContentForm = z.infer<typeof contentFormSchema>;

/** Creates or updates the item with its team, shooting and publications (one DB transaction). */
export async function saveContent(id: string | null, form: ContentForm): Promise<string> {
  const payload = {
    ...form,
    reference_links: form.reference_links.map((url) => ({ url })),
    shooting: form.shooting.mode === 'keep' ? undefined : form.shooting,
    status: id ? undefined : form.status,
    client_id: id ? undefined : form.client_id,
  };
  const { data, error } = await getSupabase().rpc('save_content', {
    // null creates a new item (the generated type does not model nullable RPC arguments)
    p_content_id: (id ?? null) as unknown as string,
    p_payload: payload as unknown as Json,
  });
  if (error) throw error;
  return data as string;
}
