import * as tus from 'tus-js-client';

import { env } from './env';
import { getSupabase } from './supabase';

export type UploadSource = {
  uri: string;
  name: string;
  mimeType: string;
  size: number;
  durationMs?: number | null;
  width?: number | null;
  height?: number | null;
};

export type UploadTarget = { clientId?: string | null; folderId?: string | null; contentId?: string | null; chatRoomId?: string | null; taskId?: string | null };

export type UploadedFile = { id: string; name: string; kind: string; size_bytes: number | null };

export type UploadHandle = { promise: Promise<UploadedFile>; cancel: () => void };

// Supabase resumable uploads accept exactly 6 MB chunks (the last one may be smaller).
const CHUNK_SIZE = 6 * 1024 * 1024;
const RETRY_DELAYS = [0, 1000, 3000, 5000, 10000, 20000];

const MIME_BY_EXT: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  m4v: 'video/x-m4v',
  webm: 'video/webm',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  heic: 'image/heic',
  webp: 'image/webp',
  gif: 'image/gif',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  pdf: 'application/pdf',
  zip: 'application/zip',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  csv: 'text/csv',
};

/** Picker results sometimes lack a MIME type; the extension decides then. */
export function guessMimeType(name: string, given?: string | null): string {
  if (given && given.includes('/')) return given;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

async function accessToken(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessiya tugagan. Qayta kiring.');
  return token;
}

/**
 * Registers the file (RLS decides who may upload where), streams it to Storage in resumable
 * 6 MB chunks with automatic retries, then marks it uploaded. Large videos survive network blips.
 */
export function startUpload(source: UploadSource, target: UploadTarget, onProgress?: (sent: number, total: number) => void): UploadHandle {
  let upload: tus.Upload | null = null;
  let cancelled = false;
  let rejectFn: ((reason: unknown) => void) | null = null;

  const promise = new Promise<UploadedFile>((resolve, reject) => {
    rejectFn = reject;
    (async () => {
      if (!env) throw new Error('Supabase is not configured');
      const supabase = getSupabase();
      const { data: file, error } = await supabase.rpc('create_file_upload', {
        p_name: source.name,
        p_mime_type: source.mimeType,
        p_size_bytes: source.size,
        p_client_id: target.clientId ?? undefined,
        p_folder_id: target.folderId ?? undefined,
        p_content_id: target.contentId ?? undefined,
        p_chat_room_id: target.chatRoomId ?? undefined,
        p_task_id: target.taskId ?? undefined,
      });
      if (error) throw error;
      if (cancelled) throw new UploadCancelled();
      if (!file.bucket || !file.storage_path) throw new Error('Fayl uchun joy ajratilmadi');

      await new Promise<void>((done, fail) => {
        upload = new tus.Upload({ uri: source.uri, name: source.name, type: source.mimeType, size: source.size } as unknown as Blob, {
          endpoint: `${env!.supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: RETRY_DELAYS,
          chunkSize: CHUNK_SIZE,
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          headers: { apikey: env!.supabaseKey, 'x-upsert': 'false' },
          metadata: { bucketName: file.bucket!, objectName: file.storage_path!, contentType: source.mimeType, cacheControl: '3600' },
          // Long uploads outlive an access token; every request carries a fresh one.
          onBeforeRequest: async (req) => {
            req.setHeader('Authorization', `Bearer ${await accessToken()}`);
          },
          onProgress: (sent, total) => onProgress?.(sent, total),
          onError: fail,
          onSuccess: () => done(),
        });
        upload.start();
      });
      if (cancelled) throw new UploadCancelled();

      const { data: done, error: completeError } = await supabase.rpc('complete_file_upload', {
        p_file_id: file.id,
        p_duration_ms: source.durationMs ? Math.round(source.durationMs) : undefined,
        p_width: source.width || undefined,
        p_height: source.height || undefined,
      });
      if (completeError) throw completeError;
      return { id: done.id, name: done.name, kind: done.kind, size_bytes: done.size_bytes };
    })().then(resolve, reject);
  });

  return {
    promise,
    cancel: () => {
      cancelled = true;
      const current = upload as tus.Upload | null;
      current?.abort(true).catch(() => undefined);
      rejectFn?.(new UploadCancelled());
    },
  };
}

export class UploadCancelled extends Error {
  constructor() {
    super('Yuklash bekor qilindi');
    this.name = 'UploadCancelled';
  }
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes)) return '';
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}
