import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database';

type Enums = Database['public']['Enums'];
export type ShootingStatus = Enums['shooting_status'];
export type ShootingAttendanceStatus = Enums['shooting_attendance_status'];
export type ShotItem = { title: string; done: boolean };

export async function fetchShooting(id: string) {
  const supabase = getSupabase();
  const [shooting, attendance, content] = await Promise.all([
    supabase
      .from('shootings')
      .select(
        `id, title, description, starts_at, ends_at, location_name, location_address, location_url, shot_list, reference_links,
         status, actual_started_at, actual_ended_at, client_id, project_id,
         client:clients(id, name, code),
         project:projects!shootings_project_id_client_id_fkey(id, name),
         manager:profiles!shootings_responsible_manager_id_fkey(id, full_name, avatar_url),
         crew:shooting_members(role, person:profiles!shooting_members_user_id_fkey(id, full_name, avatar_url))`,
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single(),
    // Visible to the person themself, attendance readers and managers (RLS); others get no rows.
    supabase.from('shooting_attendance').select('user_id, status, arrived_at, late_minutes, note, marked_at').eq('shooting_id', id),
    supabase.from('content_items').select('id, title, content_type, status, number').eq('shooting_id', id).is('deleted_at', null).order('number'),
  ]);
  if (shooting.error) throw shooting.error;
  if (attendance.error) throw attendance.error;
  if (content.error) throw content.error;
  const shotList = Array.isArray(shooting.data.shot_list) ? (shooting.data.shot_list as ShotItem[]) : [];
  return { ...shooting.data, shotList, attendance: attendance.data, content: content.data };
}
export type ShootingDetail = Awaited<ReturnType<typeof fetchShooting>>;

export async function toggleShot(shootingId: string, index: number, done: boolean) {
  const { error } = await getSupabase().rpc('toggle_shot_item', { p_shooting_id: shootingId, p_index: index, p_done: done });
  if (error) throw error;
}

/** Office-only (attendance.manage via RLS): the crew never marks itself. */
export async function markShootingAttendance(shootingId: string, userId: string, status: ShootingAttendanceStatus, arrivedAtIso?: string | null, note?: string) {
  const { data, error } = await getSupabase()
    .from('shooting_attendance')
    .update({ status, arrived_at: status === 'arrived' || status === 'late' ? arrivedAtIso ?? new Date().toISOString() : null, note: note || null })
    .eq('shooting_id', shootingId)
    .eq('user_id', userId)
    .select('user_id');
  if (error) throw error;
  if (!data?.length) throw Object.assign(new Error('forbidden'), { code: '42501' });
}

export async function updateShootingStatus(id: string, status: ShootingStatus) {
  const { error } = await getSupabase().from('shootings').update({ status }).eq('id', id);
  if (error) throw error;
}

export const shootingFormSchema = z
  .object({
    client_id: z.uuid('Mijozni tanlang'),
    project_id: z.uuid().nullable(),
    title: z.string().trim().min(1, 'Syomka nomini yozing').max(200),
    description: z.string().max(4000),
    starts_at: z.string().min(1, 'Sana va vaqtni tanlang'),
    ends_at: z.string().min(1, 'Tugash vaqtini tanlang'),
    location_name: z.string().max(200),
    location_address: z.string().max(300),
    location_url: z.string().refine((v) => v === '' || /^https:\/\/\S+$/i.test(v), 'Xarita havolasi https:// bilan boshlansin'),
    responsible_manager_id: z.uuid().nullable(),
    status: z.enum(['planned', 'confirmed', 'in_progress', 'completed', 'postponed', 'cancelled']),
    shot_list: z.array(z.object({ title: z.string().trim().min(1).max(200), done: z.boolean() })).max(100),
    crew: z.array(z.object({ user_id: z.uuid(), role: z.enum(['account_manager', 'project_manager', 'smm_manager', 'operator', 'editor', 'designer', 'copywriter', 'assistant']) })),
  })
  .refine((v) => new Date(v.ends_at).getTime() > new Date(v.starts_at).getTime(), { path: ['ends_at'], message: 'Tugash vaqti boshlanishidan keyin bo‘lsin' });
export type ShootingForm = z.infer<typeof shootingFormSchema>;

export async function saveShooting(id: string | null, form: ShootingForm): Promise<string> {
  const payload = { ...form, client_id: id ? undefined : form.client_id, location_url: form.location_url || null };
  const { data, error } = await getSupabase().rpc('save_shooting', {
    p_shooting_id: (id ?? null) as unknown as string,
    p_payload: payload as unknown as Json,
  });
  if (error) throw error;
  return data as string;
}
