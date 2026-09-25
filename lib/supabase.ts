import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/types/database';
import { env } from './env';

export type AppSupabaseClient = SupabaseClient<Database>;

// null when the public configuration is missing; the root layout shows a configuration error instead of crashing.
export const supabase: AppSupabaseClient | null = env
  ? createClient<Database>(env.supabaseUrl, env.supabaseKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    })
  : null;

export function getSupabase(): AppSupabaseClient {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  return supabase;
}

// Refresh tokens only while the app is in the foreground (native).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
