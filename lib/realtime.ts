import type { QueryClient } from '@tanstack/react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';

import { getSupabase } from './supabase';

/** Query-key roots every screen uses; realtime signals invalidate by root. */
export type QueryDomain =
  | 'me'
  | 'home'
  | 'dashboard'
  | 'content'
  | 'calendar'
  | 'approvals'
  | 'shootings'
  | 'tasks'
  | 'attendance'
  | 'notifications'
  | 'files'
  | 'chat'
  | 'plan'
  | 'reports'
  | 'team'
  | 'clients'
  | 'projects'
  | 'workspace';

const TABLE_DOMAINS: Record<string, QueryDomain[]> = {
  clients: ['clients', 'home', 'dashboard', 'me'],
  client_members: ['clients', 'team', 'me'],
  client_team_members: ['clients', 'team', 'home'],
  employees: ['team', 'dashboard'],
  user_roles: ['team', 'me'],
  projects: ['projects', 'home', 'dashboard'],
  shootings: ['shootings', 'home', 'calendar', 'dashboard'],
  shooting_members: ['shootings', 'home', 'calendar', 'dashboard'],
  shooting_attendance: ['shootings', 'attendance', 'home', 'dashboard'],
  content_items: ['content', 'home', 'calendar', 'dashboard', 'approvals'],
  content_assignments: ['content', 'home', 'tasks'],
  content_publications: ['content', 'home', 'calendar', 'dashboard'],
  content_comments: ['content'],
  content_versions: ['approvals', 'content', 'home', 'dashboard'],
  client_approvals: ['approvals', 'content', 'home', 'dashboard'],
  revisions: ['approvals', 'content', 'tasks', 'home', 'dashboard'],
  revision_comments: ['approvals', 'content'],
  tasks: ['tasks', 'home', 'calendar', 'dashboard'],
  task_assignments: ['tasks', 'home', 'dashboard'],
  task_checklist_items: ['tasks'],
  attendance: ['attendance', 'dashboard', 'home', 'team'],
  folders: ['files'],
  files: ['files', 'content', 'approvals'],
  client_subscriptions: ['plan', 'home'],
  client_plan_usage: ['plan', 'reports', 'home'],
  plan_upgrade_requests: ['plan'],
  contracts: ['clients', 'plan'],
  social_metrics: ['reports'],
  content_metrics: ['reports', 'content'],
  monthly_reports: ['reports'],
  notifications: ['notifications', 'home', 'chat'],
  chat_members: ['chat', 'notifications'],
  announcements: ['workspace', 'home', 'dashboard'],
  company_events: ['workspace', 'calendar', 'home', 'dashboard'],
  shared_documents: ['workspace'],
};

type ChangeSignal = { table?: string };

/**
 * Subscribes to the private broadcast topics the user may read and turns change signals into
 * query invalidations (batched, so a burst of writes causes one refetch per domain).
 */
export function subscribeToChanges(topics: string[], queryClient: QueryClient): () => void {
  const supabase = getSupabase();
  const pending = new Set<QueryDomain>();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    timer = null;
    const domains = [...pending];
    pending.clear();
    domains.forEach((domain) => queryClient.invalidateQueries({ queryKey: [domain] }));
  };

  const onSignal = (payload: ChangeSignal) => {
    const domains = payload.table ? TABLE_DOMAINS[payload.table] : undefined;
    if (!domains) return;
    domains.forEach((d) => pending.add(d));
    if (!timer) timer = setTimeout(flush, 250);
  };

  const channels: RealtimeChannel[] = topics.map((topic) =>
    supabase
      .channel(topic, { config: { private: true } })
      .on('broadcast', { event: 'change' }, ({ payload }) => onSignal(payload as ChangeSignal))
      .subscribe(),
  );

  return () => {
    if (timer) clearTimeout(timer);
    channels.forEach((channel) => supabase.removeChannel(channel));
  };
}
