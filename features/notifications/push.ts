import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getSupabase } from '@/lib/supabase';

// Foreground pushes appear as a banner; the app refreshes its own lists through realtime.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true }),
});

export type PushState =
  | 'unconfigured' // this build has no EAS project id: Expo cannot issue tokens
  | 'unsupported' // web
  | 'undetermined'
  | 'denied'
  | 'granted';

function projectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;
}

export async function getPushState(): Promise<PushState> {
  if (Platform.OS === 'web') return 'unsupported';
  if (!projectId()) return 'unconfigured';
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'SUN MEDIA',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: '#D4FC18',
    });
  }
}

let registeredToken: string | null = null;

/** Registers this device for the signed-in user (idempotent; refreshes "last seen"). */
export async function registerDevice(): Promise<string | null> {
  const id = projectId();
  if (!id || Platform.OS === 'web') return null;
  await ensureChannel();
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  const { error } = await getSupabase().rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
    p_device_name: Device.deviceName ?? Device.modelName ?? undefined,
    p_app_version: Constants.expoConfig?.version ?? undefined,
  });
  if (error) throw error;
  registeredToken = token;
  return token;
}

/** Asks for permission (only when the user chose to) and registers the device. */
export async function enablePush(): Promise<PushState> {
  const state = await getPushState();
  if (state === 'unconfigured' || state === 'unsupported') return state;
  if (state !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
    if (status !== 'granted') return status === 'denied' ? 'denied' : 'undetermined';
  }
  await registerDevice();
  return 'granted';
}

/** Called right before sign-out, while the session can still identify the device's owner. */
export async function unregisterDevice(): Promise<void> {
  if (!registeredToken) return;
  const token = registeredToken;
  registeredToken = null;
  await getSupabase().rpc('unregister_push_token', { p_token: token });
}

export async function setAppBadge(count: number) {
  if (Platform.OS === 'web') return;
  await Notifications.setBadgeCountAsync(Math.max(0, count)).catch(() => undefined);
}
