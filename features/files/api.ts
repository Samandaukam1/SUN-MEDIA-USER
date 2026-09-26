import { getSupabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Enums = Database['public']['Enums'];
export type FolderKind = Enums['folder_kind'];
export type Visibility = Enums['visibility_level'];

export async function fetchFilesOverview() {
  const { data, error } = await getSupabase().rpc('get_files_overview');
  if (error) throw error;
  return data;
}
export type ClientFilesSummary = Awaited<ReturnType<typeof fetchFilesOverview>>[number];

export async function fetchClientFolders(clientId: string) {
  const { data, error } = await getSupabase().rpc('get_client_folders', { p_client_id: clientId });
  if (error) throw error;
  return data;
}
export type FolderSummary = Awaited<ReturnType<typeof fetchClientFolders>>[number];

export async function fetchClient(clientId: string) {
  const { data, error } = await getSupabase().from('clients').select('id, name, code, logo_url').eq('id', clientId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchFolder(folderId: string) {
  const { data, error } = await getSupabase()
    .from('folders')
    .select('id, name, kind, visibility, is_system, client_id, client:clients(id, name, code)')
    .eq('id', folderId)
    .is('deleted_at', null)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export type FolderDetail = NonNullable<Awaited<ReturnType<typeof fetchFolder>>>;

const FILE_ROW = `id, name, kind, mime_type, size_bytes, duration_ms, width, height, bucket, storage_path, external_url, visibility, status,
  created_at, uploaded_at, uploaded_by, client_id, folder_id, content_id, task_id,
  uploader:profiles!files_uploaded_by_fkey(full_name, avatar_url)`;

export const FILE_PAGE = 40;
export type FileSort = 'newest' | 'name' | 'size';

export async function fetchFolderFiles(folderId: string, search: string, sort: FileSort, page: number) {
  let query = getSupabase().from('files').select(FILE_ROW).eq('folder_id', folderId).eq('status', 'uploaded').is('deleted_at', null);
  const term = search.trim();
  if (term) query = query.ilike('name', `%${term.replace(/[%_\\]/g, '\\$&')}%`);
  if (sort === 'name') query = query.order('name', { ascending: true });
  else if (sort === 'size') query = query.order('size_bytes', { ascending: false, nullsFirst: false });
  else query = query.order('uploaded_at', { ascending: false, nullsFirst: false });
  const { data, error } = await query.order('id').range(page * FILE_PAGE, page * FILE_PAGE + FILE_PAGE - 1);
  if (error) throw error;
  return data;
}
export type FileRow = Awaited<ReturnType<typeof fetchFolderFiles>>[number];

export async function fetchFile(fileId: string) {
  const { data, error } = await getSupabase()
    .from('files')
    .select(
      `${FILE_ROW},
       folder:folders(id, name, kind, visibility),
       client:clients(id, name, code),
       deleted_at,
       content:content_items!files_content_id_client_id_fkey(id, title, number, content_type)`,
    )
    .eq('id', fileId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
export type FileDetail = NonNullable<Awaited<ReturnType<typeof fetchFile>>>;

export async function createFolder(clientId: string, name: string, visibility: Visibility) {
  const { error } = await getSupabase().from('folders').insert({ client_id: clientId, name: name.trim(), visibility, kind: 'custom' });
  if (error) throw error;
}

export async function renameFolder(folderId: string, name: string) {
  const { error } = await getSupabase().from('folders').update({ name: name.trim() }).eq('id', folderId);
  if (error) throw error;
}

export async function deleteFolder(folderId: string) {
  const { error } = await getSupabase().from('folders').update({ deleted_at: new Date().toISOString() }).eq('id', folderId);
  if (error) throw error;
}

export async function renameFile(fileId: string, name: string) {
  const { error } = await getSupabase().from('files').update({ name: name.trim() }).eq('id', fileId);
  if (error) throw error;
}

export async function moveFile(fileId: string, folderId: string) {
  const { error } = await getSupabase().from('files').update({ folder_id: folderId }).eq('id', fileId);
  if (error) throw error;
}

export async function setFileVisibility(fileId: string, visibility: Visibility) {
  const { error } = await getSupabase().from('files').update({ visibility }).eq('id', fileId);
  if (error) throw error;
}

export async function removeFile(fileId: string) {
  const { error } = await getSupabase().rpc('remove_file', { p_file_id: fileId });
  if (error) throw error;
}

export async function registerLink(clientId: string, folderId: string, name: string, url: string) {
  const { error } = await getSupabase().rpc('register_external_file', { p_client_id: clientId, p_folder_id: folderId, p_name: name.trim(), p_external_url: url.trim() });
  if (error) throw error;
}

export async function fetchSystemFolderId(clientId: string, kind: FolderKind): Promise<string | null> {
  const { data, error } = await getSupabase().from('folders').select('id').eq('client_id', clientId).eq('kind', kind).eq('is_system', true).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
