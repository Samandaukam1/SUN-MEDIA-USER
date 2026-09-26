import { z } from 'zod';

import { getSupabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Counts & chat list
// ---------------------------------------------------------------------------
const countsSchema = z.object({
  chat_unread: z.coerce.number(),
  chat_rooms_unread: z.coerce.number(),
  notifications_unread: z.coerce.number(),
  approvals: z.coerce.number(),
});
export type InboxCounts = z.infer<typeof countsSchema>;

export async function fetchInboxCounts(): Promise<InboxCounts> {
  const { data, error } = await getSupabase().rpc('get_inbox_counts');
  if (error) throw error;
  return countsSchema.parse(data);
}

export async function fetchChats() {
  const { data, error } = await getSupabase().rpc('get_my_chats');
  if (error) throw error;
  return data;
}
export type ChatSummary = Awaited<ReturnType<typeof fetchChats>>[number];

export function chatTitle(c: { kind: ChatSummary['kind']; name: string; is_default: boolean; peer_name: string | null }): string {
  if (c.kind === 'direct') return c.peer_name ?? 'Shaxsiy chat';
  if (c.kind === 'internal' && c.is_default) return 'SUN MEDIA jamoasi';
  return c.name;
}

export async function openDirectChat(userId: string): Promise<string> {
  const { data, error } = await getSupabase().rpc('open_direct_chat', { p_user_id: userId });
  if (error) throw error;
  return data;
}

export async function createGroupChat(name: string, memberIds: string[]): Promise<string> {
  const { data, error } = await getSupabase().rpc('create_group_chat', { p_name: name.trim(), p_member_ids: memberIds });
  if (error) throw error;
  return data;
}

export async function markChatRead(roomId: string) {
  const { error } = await getSupabase().rpc('mark_chat_read', { p_room_id: roomId });
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Room & messages
// ---------------------------------------------------------------------------
export async function fetchRoom(roomId: string) {
  const { data, error } = await getSupabase()
    .from('chat_rooms')
    .select(
      `id, kind, name, description, is_default, archived_at, client_id, created_by,
       client:clients(id, name, code, logo_url),
       members:chat_members(user_id, is_admin, last_read_at, muted_until, person:profiles(id, full_name, avatar_url))`,
    )
    .eq('id', roomId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export type RoomDetail = NonNullable<Awaited<ReturnType<typeof fetchRoom>>>;

export const MESSAGE_PAGE = 40;

const MESSAGE_ROW = `id, room_id, sender_id, body, reply_to_id, is_system, created_at, edited_at, deleted_at,
  sender:profiles!messages_sender_id_fkey(full_name, avatar_url),
  attachments:message_attachments(file:files(id, name, kind, mime_type, size_bytes, width, height, duration_ms, bucket, storage_path, external_url))`;

/** Newest first; `before` pages further back in time. */
export async function fetchMessages(roomId: string, before: string | null) {
  let query = getSupabase().from('messages').select(MESSAGE_ROW).eq('room_id', roomId);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(MESSAGE_PAGE);
  if (error) throw error;
  return data;
}
export type ChatMessage = Awaited<ReturnType<typeof fetchMessages>>[number];

export async function sendMessage(roomId: string, body: string, replyTo: string | null, fileIds: string[]) {
  const { data, error } = await getSupabase().rpc('send_message', {
    p_room_id: roomId,
    p_body: body,
    p_reply_to: replyTo ?? undefined,
    p_file_ids: fileIds,
  });
  if (error) throw error;
  return data;
}

export async function editMessage(id: string, body: string) {
  const { error } = await getSupabase().from('messages').update({ body: body.trim() }).eq('id', id);
  if (error) throw error;
}

export async function deleteMessage(id: string) {
  const { error } = await getSupabase().from('messages').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function setRoomMuted(roomId: string, userId: string, mutedUntil: string | null) {
  const { error } = await getSupabase().from('chat_members').update({ muted_until: mutedUntil }).eq('room_id', roomId).eq('user_id', userId);
  if (error) throw error;
}

export async function leaveRoom(roomId: string, userId: string) {
  const { error } = await getSupabase().from('chat_members').delete().eq('room_id', roomId).eq('user_id', userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Notifications (chat messages live in the chat list instead)
// ---------------------------------------------------------------------------
export const NOTIFICATION_PAGE = 30;

export async function fetchNotifications(userId: string, page: number) {
  const { data, error } = await getSupabase()
    .from('notifications')
    .select('id, type, title, body, data, entity_type, entity_id, priority, read_at, created_at')
    .eq('user_id', userId)
    .neq('type', 'chat.message')
    .order('created_at', { ascending: false })
    .order('id')
    .range(page * NOTIFICATION_PAGE, page * NOTIFICATION_PAGE + NOTIFICATION_PAGE - 1);
  if (error) throw error;
  return data;
}
export type AppNotification = Awaited<ReturnType<typeof fetchNotifications>>[number];

export async function markNotificationsRead(ids: string[] | null) {
  const { error } = await getSupabase().rpc('mark_notifications_read', { p_ids: ids ?? undefined });
  if (error) throw error;
}
