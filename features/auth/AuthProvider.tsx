import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getSupabase } from '@/lib/supabase';
import type { AppInterface, MyContext } from '@/types/app';
import { fetchMyContext } from './api';

export type AuthStatus = 'loading' | 'signed_out' | 'pending' | 'disabled' | 'error' | 'ready';

type AuthValue = {
  status: AuthStatus;
  session: Session | null;
  context: MyContext | null;
  appInterface: AppInterface | null;
  error: unknown;
  refreshContext: () => Promise<void>;
  signOut: () => Promise<void>;
  can: (permission: string) => boolean;
};

const AuthContext = createContext<AuthValue | null>(null);

export const meQueryKey = (userId: string | undefined) => ['me', userId] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // undefined = still restoring the stored session
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabase();
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => mounted && setSession(data.session))
      .catch(() => mounted && setSession(null));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [queryClient]);

  const userId = session?.user.id;
  const contextQuery = useQuery({
    queryKey: meQueryKey(userId),
    queryFn: fetchMyContext,
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });

  const signOut = useCallback(async () => {
    try {
      await getSupabase().auth.signOut();
    } finally {
      queryClient.clear();
      setSession(null);
    }
  }, [queryClient]);

  const refreshContext = useCallback(async () => {
    await contextQuery.refetch();
  }, [contextQuery]);

  const value = useMemo<AuthValue>(() => {
    const context = contextQuery.data ?? null;
    let status: AuthStatus;
    if (session === undefined) status = 'loading';
    else if (session === null) status = 'signed_out';
    else if (contextQuery.isPending) status = 'loading';
    else if (contextQuery.isError && !context) status = 'error';
    else if (context?.status === 'disabled') status = 'disabled';
    else if (context?.status === 'pending' || !context?.interface) status = 'pending';
    else status = 'ready';

    const staffPermissions = new Set(context?.permissions ?? []);
    const clientPermissions = new Set((context?.clients ?? []).flatMap((c) => c.permissions));
    return {
      status,
      session: session ?? null,
      context,
      appInterface: status === 'ready' ? (context?.interface ?? null) : null,
      error: contextQuery.error,
      refreshContext,
      signOut,
      can: (permission) => staffPermissions.has(permission) || clientPermissions.has(permission),
    };
  }, [session, contextQuery.data, contextQuery.isPending, contextQuery.isError, contextQuery.error, refreshContext, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

/** Signed-in, fully resolved context. Only use inside role-protected screens. */
export function useMe(): MyContext & { userId: string } {
  const { context, session } = useAuth();
  if (!context || !session) throw new Error('useMe requires an authenticated context');
  return { ...context, userId: session.user.id };
}
