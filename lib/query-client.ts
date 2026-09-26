import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { isNetworkError, isPermissionError } from './errors';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Always try once: a wrong "offline" reading (captive portals, simulators after a network
      // switch) must never freeze screens. Only retries wait for the connection to come back.
      networkMode: 'offlineFirst',
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, error) => !isPermissionError(error) && isNetworkError(error) && failureCount < 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: { retry: 0, networkMode: 'offlineFirst' },
  },
});

if (Platform.OS !== 'web') {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
  );
  // Coming back to the app re-reads the connection; the OS does not always report a recovery.
  AppState.addEventListener('change', (state) => {
    if (state === 'active') NetInfo.refresh().catch(() => undefined);
  });
  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
}
