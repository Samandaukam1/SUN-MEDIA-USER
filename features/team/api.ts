import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type TeamMember = Database['public']['Functions']['get_team_directory']['Returns'][number] & {
  roles: { key: string; name: string }[];
};

/** Shared staff directory; workload / attendance / account columns are null unless the caller may see them. */
export async function fetchTeamDirectory(): Promise<TeamMember[]> {
  const { data, error } = await getSupabase().rpc('get_team_directory');
  if (error) throw error;
  return (data ?? []).map((row) => ({ ...row, roles: (Array.isArray(row.roles) ? row.roles : []) as TeamMember['roles'] }));
}
