import { getSupabase } from '@/lib/supabase';

export type Scorecard = {
  user_id: string;
  full_name: string;
  role_keys: string[];
  metrics: {
    assigned_tasks: number;
    completed_tasks: number;
    completed_on_time: number;
    overdue_tasks: number;
    on_time_rate: number | null;
    avg_completion_minutes: number | null;
    workload_minutes: number;
    revision_count: number;
    approval_rate: number | null;
    present_days: number;
    late_days: number;
    late_minutes: number;
    absent_days: number;
    excused_days: number;
    vacation_days: number;
    shootings_assigned: number;
    shootings_completed: number;
    shootings_arrived: number;
    shootings_late: number;
    shootings_absent: number;
    editor?: { videos_edited: number; contents_submitted: number; revisions: number; on_time_rate: number | null; avg_editing_minutes: number | null } | null;
    smm?: { published: number; delayed_publications: number; calendar_planned: number; calendar_completed: number; calendar_completion_rate: number | null } | null;
  };
};

/** Scorecards for [from, to] (performance.read for everyone, or your own). */
export async function fetchScorecards(fromKey: string, toKey: string, userId?: string): Promise<Scorecard[]> {
  const { data, error } = await getSupabase().rpc('get_employee_scorecards', { p_from: fromKey, p_to: toKey, p_user_id: userId });
  if (error) throw error;
  return (data ?? []) as unknown as Scorecard[];
}

export function attendanceRate(m: Scorecard['metrics']): number | null {
  const scheduled = m.present_days + m.late_days + m.absent_days;
  return scheduled ? Math.round((100 * (m.present_days + m.late_days)) / scheduled) : null;
}

export function formatMinutes(min: number | null | undefined): string {
  if (min == null) return '—';
  if (min < 60) return `${Math.round(min)} daq`;
  const h = Math.floor(min / 60);
  return h >= 24 ? `${Math.floor(h / 24)} kun ${h % 24} soat` : `${h} soat ${Math.round(min % 60)} daq`;
}
