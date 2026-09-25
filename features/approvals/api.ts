import AsyncStorage from '@react-native-async-storage/async-storage';
import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Enums = Database['public']['Enums'];
export type VersionStatus = Enums['version_status'];
export type RevisionStatus = Enums['revision_status'];
export type ApprovalDecision = Enums['approval_decision'];

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------
export type ApprovalTab = 'to_review' | 'waiting_client' | 'revisions' | 'history';

const CONTENT_EMBED = `content:content_items!content_versions_content_id_client_id_fkey(
  id, number, title, content_type, status, client_approval_due_at, revision_count,
  client:clients(id, name, code),
  thumbnail:files!content_items_thumbnail_file_fk(bucket, storage_path, external_url))`;

const VERSION_ROW = `id, version_number, status, notes, submitted_at, sent_to_client_at, decided_at, client_id, content_id,
  ${CONTENT_EMBED},
  file:files!content_versions_file_id_fkey(kind, name, duration_ms, size_bytes),
  submitter:profiles!content_versions_submitted_by_fkey(full_name, avatar_url)`;

export const APPROVAL_PAGE = 25;

export async function fetchVersionQueue(tab: Exclude<ApprovalTab, 'revisions'>, isClient: boolean, page: number) {
  let query = getSupabase().from('content_versions').select(VERSION_ROW);
  if (tab === 'to_review') query = query.eq('status', isClient ? 'client_review' : 'internal_review').order('submitted_at', { ascending: true });
  else if (tab === 'waiting_client') query = query.eq('status', 'client_review').order('sent_to_client_at', { ascending: true });
  else query = query.in('status', ['approved', 'changes_requested']).order('decided_at', { ascending: false, nullsFirst: false });
  const { data, error } = await query.order('id').range(page * APPROVAL_PAGE, page * APPROVAL_PAGE + APPROVAL_PAGE - 1);
  if (error) throw error;
  // Hidden or deleted content drops out of the embed under RLS; such versions are not actionable.
  return (data as unknown as QueueVersion[]).filter((v) => v.content);
}

export type QueueVersion = {
  id: string;
  version_number: number;
  status: VersionStatus;
  notes: string | null;
  submitted_at: string;
  sent_to_client_at: string | null;
  decided_at: string | null;
  client_id: string;
  content_id: string;
  content: {
    id: string;
    number: number;
    title: string;
    content_type: Enums['content_type'];
    status: Enums['content_status'];
    client_approval_due_at: string | null;
    revision_count: number;
    client: { id: string; name: string; code: string } | null;
    thumbnail: { bucket: string | null; storage_path: string | null; external_url: string | null } | null;
  } | null;
  file: { kind: Enums['file_kind']; name: string; duration_ms: number | null; size_bytes: number | null } | null;
  submitter: { full_name: string; avatar_url: string | null } | null;
};

export async function fetchOpenRevisions(page: number) {
  const { data, error } = await getSupabase()
    .from('revisions')
    .select(
      `id, revision_number, status, stage, summary, requested_at, version_id, content_id,
       content:content_items!revisions_content_id_client_id_fkey(id, number, title, content_type, status, client:clients(id, name, code)),
       requester:profiles!revisions_requested_by_fkey(full_name),
       comments:revision_comments(id, is_resolved, deleted_at)`,
    )
    .in('status', ['open', 'in_progress'])
    .order('requested_at', { ascending: true })
    .order('id')
    .range(page * APPROVAL_PAGE, page * APPROVAL_PAGE + APPROVAL_PAGE - 1);
  if (error) throw error;
  return data.filter((r) => r.content);
}
export type OpenRevision = Awaited<ReturnType<typeof fetchOpenRevisions>>[number];

const countsSchema = z.object({
  to_review: z.number(),
  waiting_client: z.number(),
  my_revisions: z.number(),
  my_in_review: z.number(),
});
export type ApprovalCounts = z.infer<typeof countsSchema>;

export async function fetchApprovalCounts(): Promise<ApprovalCounts> {
  const { data, error } = await getSupabase().rpc('get_approval_counts');
  if (error) throw error;
  return countsSchema.parse(data);
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------
export async function fetchReview(versionId: string) {
  const { data, error } = await getSupabase()
    .from('content_versions')
    .select(
      `id, version_number, status, notes, submitted_at, sent_to_client_at, decided_at, client_id, content_id,
       file:files!content_versions_file_id_fkey(id, name, kind, mime_type, duration_ms, width, height, size_bytes, bucket, storage_path, external_url),
       content:content_items!content_versions_content_id_client_id_fkey(id, number, title, content_type, status, client_approval_due_at, revision_count, caption,
         client:clients(id, name, code)),
       submitter:profiles!content_versions_submitted_by_fkey(full_name, avatar_url),
       decisions:client_approvals(id, stage, decision, comment, decided_at, decider:profiles!client_approvals_decided_by_fkey(full_name)),
       revisions:revisions!revisions_version_id_fkey(id, revision_number, status, stage, summary, requested_at, resolved_at,
         requester:profiles!revisions_requested_by_fkey(full_name),
         comments:revision_comments(id, timecode_ms, body, is_resolved, created_at, deleted_at, author_id,
           author:profiles!revision_comments_author_id_fkey(full_name, avatar_url)))`,
    )
    .eq('id', versionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export type Review = NonNullable<Awaited<ReturnType<typeof fetchReview>>>;
export type ReviewRevision = Review['revisions'][number];
export type ReviewComment = ReviewRevision['comments'][number];

export async function fetchSiblingVersions(contentId: string) {
  const { data, error } = await getSupabase()
    .from('content_versions')
    .select('id, version_number, status')
    .eq('content_id', contentId)
    .order('version_number', { ascending: false });
  if (error) throw error;
  return data;
}

export type DraftComment = { key: string; timecode_ms: number | null; body: string };

export async function reviewVersion(versionId: string, decision: ApprovalDecision, summary: string, comments: DraftComment[]) {
  const { data, error } = await getSupabase().rpc('review_content_version', {
    p_version_id: versionId,
    p_decision: decision,
    p_summary: summary.trim() || undefined,
    p_comments: comments.map((c) => ({ timecode_ms: c.timecode_ms, body: c.body.trim() })),
  });
  if (error) throw error;
  return data;
}

export async function addRevisionComment(revisionId: string, timecodeMs: number | null, body: string) {
  const { error } = await getSupabase().from('revision_comments').insert({ revision_id: revisionId, timecode_ms: timecodeMs, body: body.trim() });
  if (error) throw error;
}

export async function setCommentResolved(id: string, resolved: boolean) {
  const { error } = await getSupabase().from('revision_comments').update({ is_resolved: resolved }).eq('id', id);
  if (error) throw error;
}

export async function deleteRevisionComment(id: string) {
  const { error } = await getSupabase().from('revision_comments').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function setRevisionStatus(id: string, status: RevisionStatus) {
  const { error } = await getSupabase().from('revisions').update({ status }).eq('id', id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// New version
// ---------------------------------------------------------------------------
export async function fetchEditedFolderId(clientId: string): Promise<string | null> {
  const { data, error } = await getSupabase().from('folders').select('id').eq('client_id', clientId).eq('kind', 'edited').eq('is_system', true).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

export async function submitVersion(contentId: string, fileId: string, notes: string, toClient: boolean) {
  const { data, error } = await getSupabase().rpc('submit_content_version', {
    p_content_id: contentId,
    p_file_id: fileId,
    p_notes: notes.trim() || undefined,
    p_stage: toClient ? 'client' : 'internal',
  });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------------
// Unsent review notes survive leaving the screen or the app.
// ---------------------------------------------------------------------------
const draftKey = (versionId: string) => `sunmedia.review-drafts.${versionId}`;

export async function loadDrafts(versionId: string): Promise<DraftComment[]> {
  try {
    const raw = await AsyncStorage.getItem(draftKey(versionId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((d) => d && typeof d.body === 'string') : [];
  } catch {
    return [];
  }
}

export async function saveDrafts(versionId: string, drafts: DraftComment[]) {
  try {
    if (drafts.length === 0) await AsyncStorage.removeItem(draftKey(versionId));
    else await AsyncStorage.setItem(draftKey(versionId), JSON.stringify(drafts));
  } catch {
    // Drafts are a convenience; losing them never blocks the review.
  }
}
