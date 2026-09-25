import { useQuery } from '@tanstack/react-query';

import { Card, ItemRow, Section, Badge } from '@/components/ui';
import { COMPANY_EVENT_KIND } from '@/constants/labels';
import { useNav } from '@/lib/routes';
import { agencyDateKey, agencyDayRange, formatAgo, formatTime } from '@/lib/time';
import { fetchAnnouncements, fetchCompanyEvents } from '../api';

/** Staff Home block: what the whole company should know today (announcements + company events). */
export function WorkspaceHomeSection({ userId }: { userId: string }) {
  const nav = useNav();
  const today = agencyDateKey();
  const range = agencyDayRange(today);
  const announcements = useQuery({ queryKey: ['workspace', 'announcements', userId], queryFn: () => fetchAnnouncements(userId) });
  const events = useQuery({ queryKey: ['workspace', 'events', 'today', today], queryFn: () => fetchCompanyEvents(range.from, range.to) });

  const shown = (announcements.data ?? []).filter((a) => a.is_pinned || !a.read).slice(0, 3);
  const todayEvents = events.data ?? [];
  if (shown.length === 0 && todayEvents.length === 0) return null;

  return (
    <Section title="Kompaniyada" actionLabel="E’lonlar" onAction={() => nav.go('/announcements')}>
      <Card padded={false}>
        {todayEvents.map((e, i) => {
          const meta = COMPANY_EVENT_KIND[e.kind as keyof typeof COMPANY_EVENT_KIND] ?? COMPANY_EVENT_KIND.company_event;
          return (
            <ItemRow
              key={e.id}
              first={i === 0}
              icon={meta.icon}
              title={e.title}
              subtitle={`${meta.label} · ${e.all_day ? 'butun kun' : `${formatTime(e.starts_at)}–${formatTime(e.ends_at)}`}${e.location ? ` · ${e.location}` : ''}`}
              onPress={() => nav.go('/events')}
            />
          );
        })}
        {shown.map((a, i) => (
          <ItemRow
            key={a.id}
            first={todayEvents.length === 0 && i === 0}
            icon={a.is_pinned ? 'bookmark' : 'volume-2'}
            title={a.title}
            subtitle={`${a.author?.full_name ?? 'SUN MEDIA'} · ${formatAgo(a.published_at)}`}
            right={a.read ? undefined : <Badge label="Yangi" tone="accent" />}
            onPress={() => nav.go(`/announcements/${a.id}`)}
          />
        ))}
      </Card>
    </Section>
  );
}
