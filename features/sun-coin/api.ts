import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { useMe } from '@/features/auth/AuthProvider';
import { getSupabase } from '@/lib/supabase';
import { clockOffset } from './coinMotion';
import { coinShopSchema, purchaseRequestSchema, sunCoinWalletSchema, type CoinShop, type SunCoinPurchaseRequest, type SunCoinWallet } from './types';

export const sunCoinWalletKey = (userId: string) => ['sun-coin', 'wallet', userId] as const;

/** Balance and history are read from the server ledger. Client code cannot credit or debit this wallet. */
export async function fetchSunCoinWallet(signal?: AbortSignal): Promise<SunCoinWallet> {
  const request = getSupabase().rpc('get_sun_coin_wallet', { p_limit: 30 });
  const { data, error } = await (signal ? request.abortSignal(signal) : request);
  if (error) throw error;
  const wallet = sunCoinWalletSchema.parse(data);
  return { ...wallet, clockOffsetMs: clockOffset(wallet.serverNow, Date.now()) };
}

export const sunCoinShopKey = ['sun-coin', 'shop'] as const;

export async function fetchSunCoinShop(): Promise<CoinShop> {
  const { data, error } = await getSupabase().rpc('get_sun_coin_shop');
  if (error) throw error;
  return coinShopSchema.parse(data);
}

/** Asks SUN MEDIA for a pack. Nothing is credited here: coins arrive when SUN MEDIA confirms the payment. */
export async function requestSunCoinPurchase(packId: string): Promise<SunCoinPurchaseRequest> {
  const { data, error } = await getSupabase().rpc('request_sun_coin_purchase', { p_pack: packId });
  if (error) throw error;
  return purchaseRequestSchema.parse(data);
}

export async function cancelSunCoinPurchase(requestId: string): Promise<SunCoinPurchaseRequest> {
  const { data, error } = await getSupabase().rpc('cancel_sun_coin_purchase', { p_request: requestId });
  if (error) throw error;
  return purchaseRequestSchema.parse(data);
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
