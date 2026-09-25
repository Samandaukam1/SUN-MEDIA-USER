import * as WebBrowser from 'expo-web-browser';
import { StyleSheet, View } from 'react-native';

import { Avatar, Badge, Card, EmptyState, ItemRow, KeyValue, Text, Timeline, type TimelineItem } from '@/components/ui';
import { CONTENT_STATUS, CONTENT_TYPE, PLATFORM, PRIORITY, SHOOTING_STATUS, TEAM_ROLE_LABEL } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { formatDateShort, formatMonthYear, formatShortDateTime, formatTime } from '@/lib/time';
import type { Database } from '@/types/database';
import type { ContentDetail } from '../api';

type Enums = Database['public']['Enums'];

export function OverviewSection({ c }: { c: ContentDetail }) {
  const platforms = c.publications.filter((p) => p.status !== 'cancelled');
  const publish = platforms.find((p) => p.scheduled_at)?.scheduled_at;
  return (
    <>
      <Card style={styles.gap}>
        <KeyValue icon="briefcase" label="Mijoz" value={c.client?.name} />
        <KeyValue icon="folder" label="Loyiha" value={c.project?.name} />
        <KeyValue icon={CONTENT_TYPE[c.content_type].icon} label="Turi" value={CONTENT_TYPE[c.content_type].label} />
        <KeyValue icon="share-2" label="Platforma" value={platforms.map((p) => PLATFORM[p.platform].label).join(', ') || null} />
        <KeyValue icon="flag" label="Muhimlik" value={PRIORITY[c.priority].label} />
        <KeyValue icon="calendar" label="Reja oyi" value={c.plan_month ? formatMonthYear(c.plan_month) : null} />
      </Card>
      <Card style={styles.gap}>
        <Text variant="label" tone="tertiary">
          Muddatlar
        </Text>
        <KeyValue icon="video" label="Syomka" value={c.shooting ? `${formatShortDateTime(c.shooting.starts_at)}–${formatTime(c.shooting.ends_at)}` : null} />
        <KeyValue icon="map-pin" label="Joy" value={c.shooting ? [c.shooting.location_name, c.shooting.location_address].filter(Boolean).join(', ') || null : null} />
        <KeyValue icon="scissors" label="Montaj muddati" value={c.due_at ? formatShortDateTime(c.due_at) : null} />
        <KeyValue icon="check-circle" label="Mijoz tasdig‘i" value={c.client_approval_due_at ? formatShortDateTime(c.client_approval_due_at) : null} />
        <KeyValue icon="send" label="Nashr" value={publish ? formatShortDateTime(publish) : null} />
        {!c.shooting && !c.due_at && !c.client_approval_due_at && !publish ? (
          <Text variant="caption" tone="tertiary">
            Muddatlar hali belgilanmagan.
          </Text>
        ) : null}
      </Card>
      {c.description ? (
        <Card style={styles.gap}>
          <Text variant="label" tone="tertiary">
            Tavsif
          </Text>
          <Text variant="body" selectable>
            {c.description}
          </Text>
        </Card>
      ) : null}
    </>
  );
}

export function ScriptSection({ c }: { c: ContentDetail }) {
  const refs = Array.isArray(c.reference_links) ? (c.reference_links as { url?: string }[]).map((r) => r?.url).filter((u): u is string => !!u) : [];
  if (!c.script && !c.caption && !c.hashtags?.length && !c.music_reference && refs.length === 0) {
    return <EmptyState icon="edit-3" title="Ssenariy hali yozilmagan" description="Ssenariy, caption va hashtaglar shu yerda ko‘rinadi." />;
  }
  return (
    <>
      {c.script ? <TextBlock title="Ssenariy" body={c.script} /> : null}
      {c.caption ? <TextBlock title="Caption" body={c.caption} /> : null}
      {c.hashtags?.length ? (
        <Card style={styles.gap}>
          <Text variant="label" tone="tertiary">
            Hashtaglar
          </Text>
          <View style={styles.wrap}>
            {c.hashtags.map((h) => (
              <Badge key={h} label={h.startsWith('#') ? h : `#${h}`} />
            ))}
          </View>
        </Card>
      ) : null}
      {c.music_reference ? <TextBlock title="Musiqa referensi" body={c.music_reference} /> : null}
      {refs.length ? (
        <Card padded={false}>
          {refs.map((url, i) => (
            <ItemRow key={url} first={i === 0} icon="link" title={url} onPress={() => WebBrowser.openBrowserAsync(url)} />
          ))}
        </Card>
      ) : null}
    </>
  );
}

function TextBlock({ title, body }: { title: string; body: string }) {
  return (
    <Card style={styles.gap}>
      <Text variant="label" tone="tertiary">
        {title}
      </Text>
      <Text variant="body" selectable style={styles.long}>
        {body}
      </Text>
    </Card>
  );
}

export function TeamSection({ c }: { c: ContentDetail }) {
  if (c.team.length === 0) return <EmptyState icon="users" title="Jamoa biriktirilmagan" description="Operator, montajyor va boshqa mas’ullar shu yerda ko‘rinadi." />;
  return (
    <Card padded={false}>
      {c.team.map((t, i) =>
        t.person ? (
          <ItemRow
            key={`${t.role}:${t.person.id}`}
            first={i === 0}
            leading={<Avatar name={t.person.full_name} url={t.person.avatar_url} size={34} />}
            title={t.person.full_name}
            subtitle={TEAM_ROLE_LABEL[t.role as Enums['team_role']] ?? t.role}
          />
        ) : null,
      )}
    </Card>
  );
}

/** Production timeline: the planned milestones in date order (what happens when). */
export function TimelineSection({ c }: { c: ContentDetail }) {
  const items: (TimelineItem & { at: string })[] = [];
  items.push({ id: 'created', at: c.created_at, time: formatDateShort(c.created_at), kicker: 'Yaratildi', title: c.creator?.full_name ?? 'SUN MEDIA', icon: 'plus-circle' });
  if (c.shooting) {
    items.push({
      id: 'shooting',
      at: c.shooting.starts_at,
      time: formatDateShort(c.shooting.starts_at),
      kicker: `Syomka · ${formatTime(c.shooting.starts_at)}`,
      title: c.shooting.title,
      detail: [c.shooting.location_name, SHOOTING_STATUS[c.shooting.status as Enums['shooting_status']]?.label].filter(Boolean).join(' · '),
      icon: 'video',
    });
  }
  if (c.due_at) items.push({ id: 'due', at: c.due_at, time: formatDateShort(c.due_at), kicker: `Montaj muddati · ${formatTime(c.due_at)}`, title: 'Tayyor bo‘lishi kerak', icon: 'scissors' });
  if (c.client_approval_due_at) {
    items.push({ id: 'approval', at: c.client_approval_due_at, time: formatDateShort(c.client_approval_due_at), kicker: `Mijoz tasdig‘i · ${formatTime(c.client_approval_due_at)}`, title: 'Tasdiqlash muddati', icon: 'check-circle' });
  }
  c.publications
    .filter((p) => p.status !== 'cancelled' && p.scheduled_at)
    .forEach((p) =>
      items.push({ id: `pub:${p.id}`, at: p.scheduled_at!, time: formatDateShort(p.scheduled_at!), kicker: `Nashr · ${formatTime(p.scheduled_at!)}`, title: PLATFORM[p.platform].label, icon: PLATFORM[p.platform].icon }),
    );
  if (c.published_at) items.push({ id: 'published', at: c.published_at, time: formatDateShort(c.published_at), kicker: 'Joylandi', title: 'Kontent chiqdi', icon: 'send' });
  items.sort((a, b) => a.at.localeCompare(b.at));
  const nextIndex = items.findIndex((i) => new Date(i.at).getTime() >= Date.now());
  return (
    <Card>
      <Timeline items={items.map((it, i) => ({ ...it, highlight: i === nextIndex }))} />
    </Card>
  );
}

/** Status history: who moved the item and when (content_status_history). */
export function HistorySection({ c }: { c: ContentDetail }) {
  const history = [...c.history].sort((a, b) => b.changed_at.localeCompare(a.changed_at));
  if (history.length === 0) return <EmptyState icon="clock" title="Tarix bo‘sh" />;
  return (
    <Card padded={false}>
      {history.map((h, i) => (
        <ItemRow
          key={h.id}
          first={i === 0}
          icon={CONTENT_STATUS[h.to_status].icon}
          title={h.from_status ? `${CONTENT_STATUS[h.from_status].label} → ${CONTENT_STATUS[h.to_status].label}` : `Yaratildi: ${CONTENT_STATUS[h.to_status].label}`}
          subtitle={[h.actor?.full_name ?? 'Tizim', formatShortDateTime(h.changed_at), h.note].filter(Boolean).join(' · ')}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm + 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  long: { lineHeight: 23 },
});
