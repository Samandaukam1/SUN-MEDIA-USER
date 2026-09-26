import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { uploads } from '@/lib/uploadQueue';

const REFRESH = ['files', 'tasks', 'content', 'approvals', 'home'];

/** Refreshes the screens that show a file once its upload lands; cancels everything on sign-out. */
export function UploadWatcher() {
  const { status } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  useEffect(
    () =>
      uploads.onFinished((job) => {
        if (job.status === 'done') {
          REFRESH.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
          toast.show(`${job.name} yuklandi`);
          setTimeout(() => uploads.dismiss(job.id), 1500);
        } else {
          toast.show(`${job.name}: ${job.error ?? 'yuklanmadi'}`, 'error');
        }
      }),
    [queryClient, toast],
  );

  useEffect(() => {
    if (status === 'signed_out') uploads.cancelAll();
  }, [status]);

  return null;
}
