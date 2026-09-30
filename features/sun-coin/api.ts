import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useMe } from '@/features/auth/AuthProvider';
import { getSupabase } from '@/lib/supabase';
import { sunCoinWalletSchema, type SunCoinWallet } from './types';

export const sunCoinWalletKey = (userId: string) => ['sun-coin', 'wallet', userId] as const;

/** Balance and history are read from the server ledger. Client code cannot credit or debit this wallet. */
export async function fetchSunCoinWallet(signal?: AbortSignal): Promise<SunCoinWallet> {
  const request = getSupabase().rpc('get_sun_coin_wallet', { p_limit: 30 });
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw error;
  return sunCoinWalletSchema.parse(data);
}

export function useSunCoinWallet() {
  const me = useMe();
  const enabled = me.kind === 'client';
  const query = useQuery({
    queryKey: sunCoinWalletKey(me.userId),
    queryFn: ({ signal }) => fetchSunCoinWallet(signal),
    enabled,
    staleTime: 15_000,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    if (enabled) void refetch();
  }, [enabled, refetch]));
  return query;
}
