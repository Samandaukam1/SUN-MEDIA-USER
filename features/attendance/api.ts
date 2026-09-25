import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type AttendanceStatus = Database['public']['Enums']['attendance_status'];
export type RosterRow = Omit<Database['public']['Functions']['get_attendance_day']['Returns'][number], 'roles'> & { roles: { key: string; name: string }[] };

/** Office roster for one agency day (attendance.read). */
export async function fetchAttendanceDay(dateKey: string): Promise<RosterRow[]> {
  const { data, error } = await getSupabase().rpc('get_attendance_day', { p_date: dateKey });
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, roles: (Array.isArray(r.roles) ? r.roles : []) as RosterRow['roles'] }));
}

/**
 * Marks (or corrects) one employee's day. Only attendance.manage passes RLS; the database turns an
 * arrival after the start time + grace into LATE with minutes and keeps the history.
 */
export async function markAttendance(userId: string, dateKey: string, status: AttendanceStatus, arrivedAt: string | null, note: string | null) {
  const { data, error } = await getSupabase()
    .from('attendance')
    .upsert(
      { user_id: userId, work_date: dateKey, status, arrived_at: status === 'present' || status === 'late' ? arrivedAt : null, note: note?.trim() || null },
      { onConflict: 'user_id,work_date' },
    )
    .select('status, late_minutes')
    .single();
  if (error) throw error;
  // The database may turn "present" into "late" (arrival after start + grace): report what was saved.
  return data;
}

export async function markManyPresent(userIds: string[], dateKey: string) {
  if (!userIds.length) return;
  const { error } = await getSupabase()
    .from('attendance')
    .upsert(userIds.map((user_id) => ({ user_id, work_date: dateKey, status: 'present' as const })), { onConflict: 'user_id,work_date', ignoreDuplicates: true });
  if (error) throw error;
}

/** One employee's own month (self or attendance.read via RLS). */
export async function fetchAttendanceMonth(userId: string, fromKey: string, toKey: string) {
  const supabase = getSupabase();
  const [rows, summary] = await Promise.all([
    supabase.from('attendance').select('id, work_date, status, arrived_at, late_minutes, note').eq('user_id', userId).gte('work_date', fromKey).lte('work_date', toKey).order('work_date', { ascending: false }),
    supabase.rpc('get_attendance_summary', { p_user_id: userId, p_from: fromKey, p_to: toKey }),
  ]);
  if (rows.error) throw rows.error;
  if (summary.error) throw summary.error;
  return { rows: rows.data, summary: summary.data as Record<string, number | null> };
}
