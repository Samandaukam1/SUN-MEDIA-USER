import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type CalendarRow = Database['public']['Functions']['get_calendar_events']['Returns'][number];

/** Every event the caller may see in [from, to): RLS decides (clients never get internal tasks). */
export async function fetchCalendar(fromIso: string, toIso: string, clientId?: string | null): Promise<CalendarRow[]> {
  const { data, error } = await getSupabase().rpc('get_calendar_events', { p_from: fromIso, p_to: toIso, p_client_id: clientId ?? undefined });
  if (error) throw error;
  return data ?? [];
}

export type EventGroup = 'all' | 'shooting' | 'publication' | 'deadline' | 'approval' | 'company';

export function eventGroup(type: string): EventGroup {
  if (type === 'shooting') return 'shooting';
  if (type === 'publication') return 'publication';
  if (type === 'approval_deadline') return 'approval';
  if (type.startsWith('company_')) return 'company';
  return 'deadline';
}
