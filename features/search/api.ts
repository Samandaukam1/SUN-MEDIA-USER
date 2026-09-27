import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

const hitSchema = z.object({
  kind: z.enum(['content', 'task', 'shooting', 'project', 'client', 'file', 'person']),
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  status: z.string().nullable(),
  avatar_url: z.string().nullable().optional(),
  content_type: z.string().nullable().optional(),
  number: z.number().nullable().optional(),
});
export type SearchHit = z.infer<typeof hitSchema>;

export async function globalSearch(query: string): Promise<SearchHit[]> {
  const { data, error } = await getSupabase().rpc('global_search', { p_query: query, p_limit: 6 });
  if (error) throw error;
  return z.array(hitSchema).parse(data ?? []);
}
