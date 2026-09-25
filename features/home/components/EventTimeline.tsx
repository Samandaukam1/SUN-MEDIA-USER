import { Card, Timeline, type TimelineItem } from '@/components/ui';
import { CONTENT_TYPE, eventMeta, PLATFORM } from '@/constants/labels';
import { formatDateShort, formatTime } from '@/lib/time';
import type { CalendarEvent } from '@/lib/schemas';
import type { Database } from '@/types/database';

type Enums = Database['public']['Enums'];

/** Label shown above the title: event type, plus platform/format for publications. */
export function eventKicker(e: CalendarEvent): string {
  const meta = eventMeta(e.event_type);
  if (e.event_type === 'publication') {
    const platform = e.platform ? PLATFORM[e.platform as Enums['social_platform']]?.label : null;
    const type = e.content_type ? CONTENT_TYPE[e.content_type as Enums['content_type']]?.label : null;
    return [platform, type].filter(Boolean).join(' ') || meta.label;
  }
  return meta.label;
}

export function toTimelineItems(events: CalendarEvent[], opts: { withDate?: boolean; now?: Date; onPress?: (e: CalendarEvent) => void } = {}): TimelineItem[] {
  const now = (opts.now ?? new Date()).getTime();
  const nextIndex = events.findIndex((e) => new Date(e.starts_at).getTime() >= now);
  return events.map((e, i) => ({
    id: `${e.event_type}:${e.entity_id}`,
    time: opts.withDate ? formatDateShort(e.starts_at) : formatTime(e.starts_at),
    kicker: opts.withDate ? `${eventKicker(e)} · ${formatTime(e.starts_at)}` : eventKicker(e),
    title: e.title,
    detail: e.location_name ?? (opts.withDate ? null : e.client_name) ?? null,
    icon: eventMeta(e.event_type).icon,
    highlight: i === nextIndex && !opts.withDate,
    onPress: opts.onPress ? () => opts.onPress?.(e) : undefined,
  }));
}

export function EventTimeline({ events, withDate, onPress }: { events: CalendarEvent[]; withDate?: boolean; onPress?: (e: CalendarEvent) => void }) {
  return (
    <Card>
      <Timeline items={toTimelineItems(events, { withDate, onPress })} />
    </Card>
  );
}
