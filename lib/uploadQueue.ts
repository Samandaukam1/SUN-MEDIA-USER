import { useSyncExternalStore } from 'react';

import { toUserMessage } from './errors';
import { startUpload, UploadCancelled, type UploadedFile, type UploadHandle, type UploadSource, type UploadTarget } from './upload';

export type UploadStatus = 'queued' | 'uploading' | 'done' | 'failed' | 'cancelled';

export type UploadJob = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sent: number;
  target: UploadTarget;
  status: UploadStatus;
  error: string | null;
  file: UploadedFile | null;
  createdAt: number;
};

type Finished = (job: UploadJob) => void;

// Two files at a time keeps the phone responsive and each chunk fast on mobile networks.
const MAX_PARALLEL = 2;
const PROGRESS_INTERVAL_MS = 250;

let jobs: UploadJob[] = [];
const sources = new Map<string, UploadSource>();
const handles = new Map<string, UploadHandle>();
const listeners = new Set<() => void>();
const finishedListeners = new Set<Finished>();

function emit() {
  listeners.forEach((listener) => listener());
}

function patch(id: string, change: Partial<UploadJob>): UploadJob | undefined {
  let updated: UploadJob | undefined;
  jobs = jobs.map((job) => {
    if (job.id !== id) return job;
    updated = { ...job, ...change };
    return updated;
  });
  emit();
  return updated;
}

function pump() {
  const running = jobs.filter((j) => j.status === 'uploading').length;
  jobs
    .filter((j) => j.status === 'queued')
    .slice(0, Math.max(0, MAX_PARALLEL - running))
    .forEach(run);
}

function run(job: UploadJob) {
  const source = sources.get(job.id);
  if (!source) {
    patch(job.id, { status: 'failed', error: 'Fayl topilmadi, qaytadan tanlang.' });
    return;
  }
  patch(job.id, { status: 'uploading', sent: 0, error: null });
  let lastTick = 0;
  const handle = startUpload(source, job.target, (sent) => {
    const now = Date.now();
    if (now - lastTick >= PROGRESS_INTERVAL_MS) {
      lastTick = now;
      patch(job.id, { sent });
    }
  });
  handles.set(job.id, handle);
  handle.promise.then(
    (file) => {
      handles.delete(job.id);
      sources.delete(job.id);
      const done = patch(job.id, { status: 'done', sent: job.size, file });
      if (done) finishedListeners.forEach((l) => l(done));
      pump();
    },
    (error) => {
      handles.delete(job.id);
      const failed = patch(job.id, error instanceof UploadCancelled ? { status: 'cancelled' } : { status: 'failed', error: toUserMessage(error) });
      if (failed && failed.status === 'failed') finishedListeners.forEach((l) => l(failed));
      pump();
    },
  );
}

/**
 * App-wide upload queue: uploads keep going while the user moves between screens, and every
 * screen that shows a folder, task or content can list its own pending files.
 */
export const uploads = {
  enqueue(source: UploadSource, target: UploadTarget): string {
    const id = `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sources.set(id, source);
    jobs = [
      ...jobs,
      { id, name: source.name, mimeType: source.mimeType, size: source.size, sent: 0, target, status: 'queued', error: null, file: null, createdAt: Date.now() },
    ];
    emit();
    pump();
    return id;
  },
  cancel(id: string) {
    const handle = handles.get(id);
    if (handle) handle.cancel();
    else patch(id, { status: 'cancelled' });
    pump();
  },
  retry(id: string) {
    if (!sources.has(id)) return;
    patch(id, { status: 'queued', error: null, sent: 0 });
    pump();
  },
  dismiss(id: string) {
    if (handles.has(id)) return;
    jobs = jobs.filter((j) => j.id !== id);
    sources.delete(id);
    emit();
  },
  /** Sign-out: nothing keeps uploading under the previous user's session. */
  cancelAll() {
    handles.forEach((h) => h.cancel());
    jobs = [];
    sources.clear();
    emit();
  },
  onFinished(listener: Finished): () => void {
    finishedListeners.add(listener);
    return () => {
      finishedListeners.delete(listener);
    };
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => jobs;

/** Current jobs, optionally only those for one folder / task / content. Finished jobs drop out after a short while. */
export function useUploads(match?: (target: UploadTarget) => boolean): UploadJob[] {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return match ? all.filter((j) => match(j.target)) : all;
}
