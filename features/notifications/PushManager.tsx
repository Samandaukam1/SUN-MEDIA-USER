import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { markNotificationsRead } from '@/features/inbox/api';
import { useInboxBadge } from '@/features/inbox/useInboxBadge';
import { notificationPath } from '@/lib/deeplink';
import { INTERFACE_BASE } from '@/lib/routes';
import { getPushState, registerDevice, setAppBadge } from './push';

/** Push wiring for a signed-in user: device registration, tap-to-open and the app icon badge. */
export function PushManager() {
  const { status } = useAuth();
  return status === 'ready' ? <ReadyPushManager /> : null;
}

function ReadyPushManager() {
  const { appInterface, context } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const badge = useInboxBadge();
  const handledColdStart = useRef(false);
  const kind = context?.kind === 'staff' ? 'staff' : 'client';
  const base = INTERFACE_BASE[appInterface ?? 'client'];

  // Permission was given earlier: keep the token fresh for this user without asking again.
  useEffect(() => {
    getPushState()
      .then((state) => (state === 'granted' ? registerDevice() : null))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const open = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const data = (response.notification.request.content.data ?? {}) as { route?: unknown; notification_id?: unknown };
      if (typeof data.notification_id === 'string') {
        markNotificationsRead([data.notification_id])
          .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
          .catch(() => undefined);
      }
      const path = notificationPath(data.route, kind);
      if (path) router.push(`${base}${path}` as Href);
    };
    if (!handledColdStart.current) {
      handledColdStart.current = true;
      // A tap that launched the app is handled once, then forgotten so the next launch starts clean.
      const launched = Notifications.getLastNotificationResponse();
      if (launched) {
        open(launched);
        Notifications.clearLastNotificationResponse();
      }
    }
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, [base, kind, router, queryClient]);

  useEffect(() => {
    setAppBadge(badge);
  }, [badge]);

  return null;
}
