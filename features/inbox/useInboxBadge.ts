import { useQuery } from '@tanstack/react-query';

import { fetchInboxCounts } from './api';

/** Unread conversations + unread notifications for the INBOX tab badge. */
export function useInboxBadge(): number {
  const counts = useQuery({ queryKey: ['notifications', 'inbox-counts'], queryFn: fetchInboxCounts, refetchInterval: 60_000 });
  return (counts.data?.chat_rooms_unread ?? 0) + (counts.data?.notifications_unread ?? 0);
}
