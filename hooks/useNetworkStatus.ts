import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

/** true = online, false = offline, null = not determined yet */
export function useNetworkStatus(): boolean | null {
  const [online, setOnline] = useState<boolean | null>(Platform.OS === 'web' ? true : null);
  useEffect(() => {
    if (Platform.OS === 'web') return; // navigator.onLine events not needed; assume online
    return NetInfo.addEventListener((state) => {
      // Only a missing connection counts: the internet probe fails on some networks while our API works.
      setOnline(state.isConnected !== false);
    });
  }, []);
  return online;
}
