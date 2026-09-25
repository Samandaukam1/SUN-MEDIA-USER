import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';

import { subscribeToChanges } from '@/lib/realtime';
import { getSupabase } from '@/lib/supabase';
import { useAuth } from './AuthProvider';

/** Keeps every screen live: one subscription set per signed-in user, cleaned up on sign-out. */
export function RealtimeSync() {
  const { status, session, context } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const topics = useMemo(() => {
    if (status !== 'ready' || !userId || !context) return [];
    const list = [`user:${userId}`];
    if (context.kind === 'staff') list.push('staff');
    context.clients.forEach((client) => list.push(`client:${client.id}`));
    return list;
  }, [status, userId, context]);

  const topicsKey = topics.join('|');
  useEffect(() => {
    if (!topicsKey || !session) return;
    getSupabase().realtime.setAuth(session.access_token);
    return subscribeToChanges(topicsKey.split('|'), queryClient);
    // Re-subscribe only when the topic set or the user changes; token refreshes are handled by supabase-js.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicsKey, queryClient]);

  return null;
}
