import { z } from 'zod';

import { UserFacingError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------
export type Announcement = Pick<
  Tables['announcements']['Row'],
  'id' | 'title' | 'body' | 'is_pinned' | 'audience_roles' | 'published_at' | 'expires_at' | 'author_id'
> & { author: { full_name: string; avatar_url: string | null } | null; read: boolean };

export async function fetchAnnouncements(userId: string, limit = 50): Promise<Announcement[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('announcements')
    .select(
      `id, title, body, is_pinned, audience_roles, published_at, expires_at, author_id,
       author:profiles!announcements_author_id_fkey(full_name, avatar_url),
       reads:announcement_reads(user_id)`,
    )
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  // Your own post is never "new" to you.
  return data.map(({ reads, ...a }) => ({ ...a, read: a.author_id === userId || reads.some((r) => r.user_id === userId) }));
}

export async function fetchAnnouncement(id: string, userId: string): Promise<Announcement> {
  const { data, error } = await getSupabase()
    .from('announcements')
    .select(
      `id, title, body, is_pinned, audience_roles, published_at, expires_at, author_id,
       author:profiles!announcements_author_id_fkey(full_name, avatar_url),
       reads:announcement_reads(user_id)`,
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  const { reads, ...a } = data;
  return { ...a, read: a.author_id === userId || reads.some((r) => r.user_id === userId) };
}

export async function markAnnouncementRead(announcementId: string, userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from('announcement_reads')
    .upsert({ announcement_id: announcementId, user_id: userId }, { onConflict: 'announcement_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
}

export const announcementInput = z.object({
  title: z.string().trim().min(1, 'Sarlavhani yozing').max(160, '160 belgidan oshmasin'),
  body: z.string().trim().min(1, 'Matnni yozing').max(4000, '4000 belgidan oshmasin'),
  is_pinned: z.boolean(),
  audience_roles: z.array(z.string()).nullable(),
});
export type AnnouncementInput = z.infer<typeof announcementInput>;

export async function createAnnouncement(input: AnnouncementInput): Promise<void> {
  const parsed = announcementInput.parse(input);
  const { error } = await getSupabase()
    .from('announcements')
    .insert({ ...parsed, audience_roles: parsed.audience_roles?.length ? parsed.audience_roles : null });
  if (error) throw error;
}

export async function archiveAnnouncement(id: string): Promise<void> {
  const { error } = await getSupabase().from('announcements').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Company events
// ---------------------------------------------------------------------------
export type CompanyEventKind = 'meeting' | 'holiday' | 'day_off' | 'company_event' | 'training' | 'birthday';
export type CompanyEvent = Pick<Tables['company_events']['Row'], 'id' | 'title' | 'kind' | 'starts_at' | 'ends_at' | 'all_day' | 'location' | 'description'>;

export async function fetchCompanyEvents(fromIso: string, toIso: string): Promise<CompanyEvent[]> {
  const { data, error } = await getSupabase()
    .from('company_events')
    .select('id, title, kind, starts_at, ends_at, all_day, location, description')
    .lt('starts_at', toIso)
    .gte('ends_at', fromIso)
    .order('starts_at');
  if (error) throw error;
  return data;
}

export const companyEventInput = z
  .object({
    title: z.string().trim().min(1, 'Nomini yozing').max(160),
    kind: z.enum(['meeting', 'holiday', 'day_off', 'company_event', 'training', 'birthday']),
    starts_at: z.string(),
    ends_at: z.string(),
    all_day: z.boolean(),
    location: z.string().trim().max(200).nullable(),
    description: z.string().trim().max(2000).nullable(),
  })
  .refine((v) => new Date(v.ends_at).getTime() >= new Date(v.starts_at).getTime(), {
    message: 'Tugash vaqti boshlanishidan oldin bo‘lmasin',
    path: ['ends_at'],
  });
export type CompanyEventInput = z.infer<typeof companyEventInput>;

export async function createCompanyEvent(input: CompanyEventInput): Promise<void> {
  const parsed = companyEventInput.parse(input);
  const { error } = await getSupabase()
    .from('company_events')
    .insert({ ...parsed, location: parsed.location || null, description: parsed.description || null });
  if (error) throw error;
}

export async function cancelCompanyEvent(id: string): Promise<void> {
  const { error } = await getSupabase().from('company_events').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Shared documents
// ---------------------------------------------------------------------------
export type DocumentCategory = 'sop' | 'guide' | 'brand' | 'policy' | 'template' | 'other';
export type SharedDocument = Pick<Tables['shared_documents']['Row'], 'id' | 'title' | 'category' | 'description' | 'url' | 'file_id' | 'is_pinned' | 'updated_at'>;

export async function fetchSharedDocuments(): Promise<SharedDocument[]> {
  const { data, error } = await getSupabase()
    .from('shared_documents')
    .select('id, title, category, description, url, file_id, is_pinned, updated_at')
    .order('is_pinned', { ascending: false })
    .order('title');
  if (error) throw error;
  return data;
}

export const documentInput = z.object({
  title: z.string().trim().min(1, 'Nomini yozing').max(160),
  category: z.enum(['sop', 'guide', 'brand', 'policy', 'template', 'other']),
  description: z.string().trim().max(1000).nullable(),
  url: z
    .string()
    .trim()
    .refine((v) => /^https:\/\/\S+$/i.test(v), 'Havola https:// bilan boshlansin'),
  is_pinned: z.boolean(),
});
export type DocumentInput = z.infer<typeof documentInput>;

export async function createSharedDocument(input: DocumentInput): Promise<void> {
  const parsed = documentInput.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? 'Ma’lumotlarni tekshiring');
  const { error } = await getSupabase()
    .from('shared_documents')
    .insert({ ...parsed.data, description: parsed.data.description || null });
  if (error) throw error;
}
