import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

/** Sozlamalar → Ko‘rinish: follow the phone, or always light / dark. Stored on this device. */
export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'sunmedia.theme';
let value: ThemePreference = 'system';
const listeners = new Set<() => void>();

AsyncStorage.getItem(KEY)
  .then((stored) => {
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      value = stored;
      listeners.forEach((l) => l());
    }
  })
  .catch(() => undefined);

export function setThemePreference(next: ThemePreference): void {
  value = next;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(KEY, next).catch(() => undefined);
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => value,
    () => value,
  );
}
