import { useQuery } from '@tanstack/react-query';

import { getSupabase } from './supabase';

export type StoredFile = { bucket: string | null; storage_path: string | null; external_url: string | null } | null | undefined;

const SIGNED_TTL_SECONDS = 60 * 60;

/** Short-lived signed URL for a private storage object (or the file's external link). */
export async function signedUrl(file: NonNullable<StoredFile>): Promise<string | null> {
  if (file.external_url) return file.external_url;
  if (!file.storage_path || !file.bucket) return null;
  const { data, error } = await getSupabase().storage.from(file.bucket).createSignedUrl(file.storage_path, SIGNED_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

/** Cached signed URL; refreshed well before it expires. Storage RLS decides who may sign. */
export function useSignedUrl(file: StoredFile) {
  return useQuery({
    queryKey: ['files', 'signed', file?.bucket, file?.storage_path, file?.external_url],
    queryFn: () => signedUrl(file!),
    enabled: !!file && !!(file.storage_path || file.external_url),
    staleTime: (SIGNED_TTL_SECONDS - 600) * 1000,
    gcTime: SIGNED_TTL_SECONDS * 1000,
  });
}
