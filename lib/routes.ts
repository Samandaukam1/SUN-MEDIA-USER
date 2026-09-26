import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import type { AppInterface } from '@/types/app';

/** Each interface owns its URL space; shared detail screens exist under every base that needs them. */
export const INTERFACE_BASE: Record<AppInterface, '/client' | '/staff' | '/manage'> = {
  client: '/client',
  employee: '/staff',
  management: '/manage',
};

export type InterfaceBase = (typeof INTERFACE_BASE)[AppInterface];

export function useInterfaceBase(): InterfaceBase {
  const { appInterface } = useAuth();
  return INTERFACE_BASE[appInterface ?? 'client'];
}

/** Typed helpers for pushing shared screens under the current interface. */
export function useNav() {
  const router = useRouter();
  const base = useInterfaceBase();
  return useMemo(() => {
    const go = (path: string) => router.push(`${base}${path}` as Href);
    return {
      base,
      go,
      back: () => (router.canGoBack() ? router.back() : router.replace(base as Href)),
      content: (id: string) => go(`/content/${id}`),
      shooting: (id: string) => go(`/shooting/${id}`),
      task: (id: string) => go(`/task/${id}`),
      project: (id: string) => go(`/projects/${id}`),
      employee: (id: string) => go(`/employee/${id}`),
      client: (id: string) => go(`/clients/${id}`),
      chat: (roomId: string) => go(`/chat/${roomId}`),
      review: (versionId: string) => go(`/approvals/${versionId}`),
      approvals: () => go('/approvals'),
      files: () => go('/files'),
      clientFiles: (clientId: string) => go(`/files/${clientId}`),
      folder: (folderId: string) => go(`/files/folder/${folderId}`),
      file: (fileId: string) => go(`/files/view/${fileId}`),
      report: (id: string) => go(`/report/${id}`),
    };
  }, [router, base]);
}
