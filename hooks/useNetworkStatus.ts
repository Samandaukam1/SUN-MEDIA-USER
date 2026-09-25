import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** true = online, false = offline, null = not determined yet */
export function useNetworkStatus(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        setOnline(state.isConnected !== false && state.isInternetReachable !== false);
      }),
    [],
  );
  return online;
}
