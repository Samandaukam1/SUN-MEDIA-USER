import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

export async function fetchReports() {
  const { data, error } = await getSupabase()
    .from('monthly_reports')
    .select('id, client_id, period_month, status, title, generated_at, published_at, pdf_path, client:clients(id, name, code, logo_url)')
    .order('period_month', { ascending: false })
    .order('client_id')
    .limit(100);
  if (error) throw error;
  return data;
}
export type ReportRow = Awaited<ReturnType<typeof fetchReports>>[number];

const num = z.coerce.number().nullable();
const metricSchema = z.object({
  key: z.string(),
  section: z.enum(['delivery', 'social', 'production', 'approvals', 'calendar', 'internal']),
  label: z.string(),
  value: num,
  previous: num,
  target: num,
  unit: z.string().nullable(),
  internal: z.boolean(),
});
const reportSchema = z.object({
  id: z.string(),
  client: z.object({ id: z.string(), name: z.string(), code: z.string(), logo_url: z.string().nullable() }),
  period_month: z.string(),
  month_label: z.string(),
  status: z.enum(['draft', 'published']),
  title: z.string(),
  highlights: z.string().nullable(),
  generated_at: z.string().nullable(),
  published_at: z.string().nullable(),
  pdf_path: z.string().nullable(),
  pdf_generated_at: z.string().nullable(),
  plan_name: z.string().nullable(),
  metrics: z.array(metricSchema),
  top_contents: z.array(
    z.object({
      rank: z.number(),
      content_id: z.string().nullable(),
      title: z.string(),
      content_type: z.string().nullable(),
      platform: z.string().nullable(),
      post_url: z.string().nullable(),
      views: num,
      likes: num,
      comments: num,
      shares: num,
      saves: num,
    }),
  ),
});
export type Report = z.infer<typeof reportSchema>;
export type ReportMetric = z.infer<typeof metricSchema>;

export async function fetchReport(id: string): Promise<Report | null> {
  const { data, error } = await getSupabase().rpc('get_report', { p_report_id: id });
  if (error) throw error;
  return data ? reportSchema.parse(data) : null;
}

export async function generateReport(clientId: string, month: string) {
  const { data, error } = await getSupabase().rpc('generate_monthly_report', { p_client_id: clientId, p_month: month });
  if (error) throw error;
  return data;
}

export async function publishReport(id: string) {
  const { error } = await getSupabase().rpc('publish_monthly_report', { p_report_id: id });
  if (error) throw error;
}

export async function unpublishReport(id: string) {
  const { error } = await getSupabase().rpc('archive_monthly_report', { p_report_id: id });
  if (error) throw error;
}

export async function saveHighlights(id: string, highlights: string) {
  const { error } = await getSupabase().from('monthly_reports').update({ highlights: highlights.trim() || null }).eq('id', id);
  if (error) throw error;
}

export async function fetchReportClients() {
  const { data, error } = await getSupabase().from('clients').select('id, name, code').is('deleted_at', null).order('name');
  if (error) throw error;
  return data;
}

export type ContentMetricsInput = { views: number | null; reach: number | null; likes: number | null; comments: number | null; shares: number | null; saves: number | null };

export async function fetchPublicationMetrics(contentId: string) {
  const { data, error } = await getSupabase()
    .from('content_metrics')
    .select('publication_id, views, reach, likes, comments, shares, saves, captured_at')
    .eq('content_id', contentId);
  if (error) throw error;
  return data;
}

/** One current snapshot per publication; the latest entry replaces the previous one. */
export async function saveContentMetrics(ref: { publicationId: string; contentId: string; clientId: string }, values: ContentMetricsInput) {
  const { error } = await getSupabase()
    .from('content_metrics')
    .upsert(
      { publication_id: ref.publicationId, content_id: ref.contentId, client_id: ref.clientId, source: 'manual', ...values, captured_at: new Date().toISOString() },
      { onConflict: 'publication_id' },
    );
  if (error) throw error;
}

/** "120 000" */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return '—';
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  const [whole, frac] = String(rounded).split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (frac ? `,${frac}` : '');
}

/** Difference in percentage points for metrics that are already percentages (engagement, completion). */
export function deltaPoints(value: number | null, previous: number | null): number | null {
  if (value == null || previous == null) return null;
  return Math.round((value - previous) * 10) / 10;
}

/** Change vs the previous month in percent, or null when there is nothing to compare. */
export function deltaPercent(value: number | null, previous: number | null): number | null {
  if (value == null || previous == null || previous === 0) return null;
  return Math.round(((value - previous) / Math.abs(previous)) * 100);
}
