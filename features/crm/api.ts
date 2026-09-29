import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

const nullableString = z.string().nullable();
const count = z.coerce.number();

// ---------------------------------------------------------------------------
// Staff (Admin: Yangi / Yuborilmagan / Yuborilgan; Rahbar: read-only)
// ---------------------------------------------------------------------------
const summarySchema = z.object({
  new: count,
  pending: count,
  delivered_today: count,
  today: count,
  failed: count,
  can_manage: z.boolean(),
  clients: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      code: z.string(),
      logo_url: nullableString,
      new: count,
      pending: count,
      ready: count,
      delivered_today: count,
      today: count,
      last_lead_at: nullableString,
    }),
  ),
});
export type CrmSummary = z.infer<typeof summarySchema>;

export async function fetchCrmSummary(): Promise<CrmSummary> {
  const { data, error } = await getSupabase().rpc('get_crm_summary');
  if (error) throw error;
  return summarySchema.parse(data);
}

export type LeadState = 'new' | 'pending' | 'delivered' | 'discarded';
export const LEADS_PAGE = 40;

export async function fetchLeads(state: LeadState, clientId: string | null, before: string | null) {
  const { data, error } = await getSupabase().rpc('get_leads', {
    p_state: state,
    p_client: clientId ?? undefined,
    p_before: before ?? undefined,
    p_limit: LEADS_PAGE,
  });
  if (error) throw error;
  return data;
}
export type LeadRow = Awaited<ReturnType<typeof fetchLeads>>[number];

const leadSchema = z.object({
  id: z.string(),
  client_id: z.string(),
  client: z.object({ id: z.string(), name: z.string(), code: z.string() }),
  full_name: nullableString,
  phone: nullableString,
  email: nullableString,
  campaign_name: nullableString,
  adset_name: nullableString,
  ad_name: nullableString,
  form_name: nullableString,
  page_name: nullableString,
  platform: nullableString,
  fields: z.record(z.string(), z.string().nullable()).catch({}),
  lead_at: z.string(),
  received_at: z.string(),
  fetch_status: z.enum(['pending', 'complete', 'failed']),
  fetch_error: nullableString,
  delivery_status: z.enum(['pending', 'delivered', 'discarded']),
  delivered_at: nullableString,
  delivered_by_name: nullableString,
  discarded_reason: nullableString,
  can_manage: z.boolean(),
});
export type LeadDetail = z.infer<typeof leadSchema>;

export async function fetchLead(id: string): Promise<LeadDetail> {
  const { data, error } = await getSupabase().rpc('get_lead', { p_lead_id: id });
  if (error) throw error;
  return leadSchema.parse(data);
}

const deliverySchema = z.object({ delivered: count, delivery_id: nullableString });

/** Given leads, or every ready lead of the client when `leadIds` is omitted. */
export async function deliverLeads(clientId: string, leadIds?: string[]) {
  const { data, error } = await getSupabase().rpc('deliver_leads', { p_client: clientId, p_lead_ids: leadIds });
  if (error) throw error;
  return deliverySchema.parse(data);
}

export async function discardLeads(leadIds: string[], reason?: string) {
  const { data, error } = await getSupabase().rpc('discard_leads', { p_lead_ids: leadIds, p_reason: reason });
  if (error) throw error;
  return data;
}

export async function restoreLead(leadId: string) {
  const { error } = await getSupabase().rpc('restore_lead', { p_lead_id: leadId });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// CRM reports
// ---------------------------------------------------------------------------
const reportDataSchema = z.object({
  period_start: z.string(),
  period_end: z.string(),
  days: count,
  total: count,
  delivered: count,
  pending: count,
  daily_average: count,
  by_campaign: z.array(z.object({ name: z.string(), count })),
  top_ads: z.array(z.object({ name: z.string(), campaign: nullableString, count })),
  daily: z.array(z.object({ date: z.string(), count })),
  weekly: z.array(z.object({ week_start: z.string(), count })),
});
export type CrmReportData = z.infer<typeof reportDataSchema>;

export async function previewCrmReport(clientId: string, from: string, to: string): Promise<CrmReportData> {
  const { data, error } = await getSupabase().rpc('preview_crm_report', { p_client: clientId, p_from: from, p_to: to });
  if (error) throw error;
  return reportDataSchema.parse(data);
}

export type CrmReportKind = 'weekly' | 'monthly' | 'custom';

export async function sendCrmReport(clientId: string, kind: CrmReportKind, from: string, to: string, note?: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('send_crm_report', { p_client: clientId, p_kind: kind, p_from: from, p_to: to, p_note: note || undefined });
  if (error) throw error;
  return data;
}

export async function fetchCrmReports(clientId?: string) {
  let query = getSupabase()
    .from('crm_reports')
    .select('id, client_id, kind, period_start, period_end, sent_at, data, client:clients(id, name, code, logo_url)')
    .order('sent_at', { ascending: false })
    .limit(60);
  if (clientId) query = query.eq('client_id', clientId);
  const { data, error } = await query;
  if (error) throw error;
  return data.map((r) => ({ ...r, total: Number((r.data as { total?: unknown } | null)?.total ?? 0) }));
}
export type CrmReportRow = Awaited<ReturnType<typeof fetchCrmReports>>[number];

export async function fetchCrmReport(id: string) {
  const { data, error } = await getSupabase()
    .from('crm_reports')
    .select('id, client_id, kind, period_start, period_end, sent_at, note, data, client:clients(id, name, code, logo_url), sender:profiles!crm_reports_sent_by_fkey(full_name)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return { ...data, report: reportDataSchema.parse(data.data) };
}
export type CrmReport = Awaited<ReturnType<typeof fetchCrmReport>>;

// ---------------------------------------------------------------------------
// Client: only what SUN MEDIA delivered
// ---------------------------------------------------------------------------
export type ClientLeadPeriod = 'today' | '7d' | '30d' | 'all';

const clientLeadSchema = z.object({
  id: z.string(),
  full_name: nullableString,
  phone: nullableString,
  email: nullableString,
  campaign_name: nullableString,
  ad_name: nullableString,
  form_name: nullableString,
  platform: nullableString,
  lead_at: z.string(),
  delivered_at: nullableString,
  fields: z.record(z.string(), z.string().nullable()).catch({}),
});
export type ClientLead = z.infer<typeof clientLeadSchema>;

const clientLeadsSchema = z.object({
  counts: z.object({ today: count, '7d': count, '30d': count, all: count }),
  leads: z.array(clientLeadSchema),
});
export type ClientLeads = z.infer<typeof clientLeadsSchema>;

export async function fetchClientLeads(clientId: string, period: ClientLeadPeriod, before: string | null): Promise<ClientLeads> {
  const { data, error } = await getSupabase().rpc('get_client_leads', { p_client: clientId, p_period: period, p_before: before ?? undefined, p_limit: LEADS_PAGE });
  if (error) throw error;
  return clientLeadsSchema.parse(data);
}

/** "fb" / "ig" as Meta reports the placement of the lead form. */
export function platformLabel(platform: string | null | undefined): string | null {
  if (!platform) return null;
  const p = platform.toLowerCase();
  if (p === 'ig' || p === 'instagram') return 'Instagram';
  if (p === 'fb' || p === 'facebook') return 'Facebook';
  if (p === 'msg' || p === 'messenger') return 'Messenger';
  return platform;
}

/** Form question keys ("qaysi_filial") as readable labels ("Qaysi filial"). */
export function fieldLabel(key: string): string {
  const text = key.replace(/[_-]+/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
