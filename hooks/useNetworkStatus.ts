import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

/** true = online, false = offline, null = not determined yet */
export function useNetworkStatus(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(
    () =>
      NetInfo.addEventListener((state) => {
        // Only a missing connection counts: the internet probe fails on some networks while our API works.
        setOnline(state.isConnected !== false);
      }),
    [],
  );
  return online;
}
