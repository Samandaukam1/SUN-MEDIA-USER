import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Chip, ChipRow, Counters, EmptyState, ItemRow, ProgressBar, QueryView, Screen, SearchField, Section, Text } from '@/components/ui';
import { CONTENT_STATUS, CONTENT_PIPELINE, PRIORITY, ROLE_LABEL, TEAM_ROLE_LABEL } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useNav } from '@/lib/routes';
import { formatAgo, formatMonthYear, formatShortDateTime, formatRelativeDeadline } from '@/lib/time';
import { formatBytes } from '@/lib/upload';
import type { Database } from '@/types/database';
import { fetchClientOverview, fetchClients, type ClientOverview } from './api';

type Enums = Database['public']['Enums'];

const CLIENT_STATUS: Record<Enums['client_status'], { label: string; tone: 'success' | 'warning' | 'neutral' | 'danger' }> = {
  active: { label: 'Faol', tone: 'success' },
  paused: { label: 'To‘xtatilgan', tone: 'warning' },
  disabled: { label: 'O‘chirilgan', tone: 'danger' },
  archived: { label: 'Arxiv', tone: 'neutral' },
};

/** Clients the current staff member may see (RLS), searchable. */
export function ClientsScreen() {
  const nav = useNav();
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['clients', 'list'], queryFn: fetchClients });
  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter((c) => !term || c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term));
  }, [query.data, search]);
  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: 'Mijozlar' }} />
      <SearchField value={search} onChangeText={setSearch} placeholder="Nomi yoki kodi" />
      <QueryView query={query} isEmpty={() => list.length === 0} empty={{ icon: 'briefcase', title: search ? 'Topilmadi' : 'Mijoz yo‘q' }}>
        {() => (
          <Card padded={false}>
            {list.map((c, i) => {
              const status = CLIENT_STATUS[c.status as Enums['client_status']] ?? CLIENT_STATUS.active;
              return (
                <ItemRow
                  key={c.id}
                  first={i === 0}
                  leading={<Avatar name={c.code} url={c.logo_url} size={40} />}
                  title={c.name}
                  subtitle={[c.code, c.industry].filter(Boolean).join(' · ')}
                  right={c.status === 'active' ? undefined : <Badge label={status.label} tone={status.tone} />}
                  onPress={() => nav.client(c.id)}
                />
              );
            })}
          </Card>
        )}
      </QueryView>
    </Screen>
  );
}

/** One client on one screen: plan usage, pipeline, shootings, tasks, people, reports and files. */
export function ClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['clients', 'overview', id], queryFn: () => fetchClientOverview(id), enabled: !!id });
  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: query.data?.client.name ?? 'Mijoz' }} />
      <QueryView query={query}>
        {(o) => (o ? <ClientBody o={o} /> : <EmptyState icon="briefcase" title="Mijoz topilmadi" description="U o‘chirilgan yoki sizga ko‘rinmaydi." />)}
      </QueryView>
    </Screen>
  );
}

function ClientBody({ o }: { o: ClientOverview }) {
  const nav = useNav();
  const [tab, setTab] = useState<'work' | 'people'>('work');
  const inProduction = CONTENT_PIPELINE.filter((s) => !['idea', 'approved', 'scheduled', 'published'].includes(s)).reduce((sum, s) => sum + (o.pipeline[s] ?? 0), 0);
  const planTotals = o.plan?.usage.reduce((acc, u) => ({ used: acc.used + u.used, planned: acc.planned + (u.planned ?? 0) }), { used: 0, planned: 0 });

  return (
    <>
      <Card variant="hero" style={styles.hero}>
        <View style={styles.row}>
          <Avatar name={o.client.code} url={o.client.logo_url} size={48} />
          <View style={styles.flex}>
            <Text variant="title" tone="hero" numberOfLines={1}>
              {o.client.name}
            </Text>
            <Text variant="caption" tone="heroSecondary">
              {[o.client.code, o.client.industry, o.plan ? `${o.plan.name} tarifi` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
        <Counters
          onHero
          items={[
            { label: 'Jarayonda', value: inProduction },
            { label: 'Mijozda', value: o.waiting_client.count, tone: o.waiting_client.count ? 'brand' : 'hero' },
            { label: 'Bu oy joylandi', value: o.published_this_month },
          ]}
        />
      </Card>

      <View style={styles.actions}>
        <Button title="Fayllar" icon="folder" variant="secondary" size="md" fullWidth={false} style={styles.flex} onPress={() => nav.clientFiles(o.client.id)} />
        {o.chat_room_id ? (
          <Button title="Chat" icon="message-circle" variant="secondary" size="md" fullWidth={false} style={styles.flex} onPress={() => nav.chat(o.chat_room_id!)} />
        ) : null}
      </View>

      <ChipRow>
        <Chip label="Ish" selected={tab === 'work'} onPress={() => setTab('work')} />
        <Chip label={`Odamlar · ${o.team.length + o.contacts.length}`} selected={tab === 'people'} onPress={() => setTab('people')} />
      </ChipRow>

      {tab === 'work' ? (
        <>
          {o.plan ? (
            <Section title={`Tarif · ${o.plan.days_left} kun qoldi`}>
              <Card style={styles.usage}>
                {planTotals && planTotals.planned ? (
                  <View style={styles.usageRow}>
                    <View style={styles.row}>
                      <Text variant="subheading" style={styles.flex}>
                        Umumiy bajarilish
                      </Text>
                      <Text variant="subheading">{`${planTotals.used} / ${planTotals.planned}`}</Text>
                    </View>
                    <ProgressBar value={planTotals.used / planTotals.planned} label="Umumiy bajarilish" />
                  </View>
                ) : null}
                {o.plan.usage.map((u) => (
                  <View key={u.service_name} style={styles.row}>
                    <Text variant="caption" tone="secondary" style={styles.flex}>
                      {u.service_name}
                    </Text>
                    <Text variant="captionMedium" style={styles.num}>{`${u.used} / ${u.planned ?? '∞'} ${u.unit}`}</Text>
                  </View>
                ))}
              </Card>
            </Section>
          ) : o.plan_visible ? (
            <Card variant="sunken">
              <Text variant="caption" tone="secondary">
                Faol tarif yo‘q. Tarifni admin panelda biriktiring.
              </Text>
            </Card>
          ) : null}

          <Section title="Kontent jarayoni">
            <Card style={styles.pipeline}>
              {CONTENT_PIPELINE.filter((s) => (o.pipeline[s] ?? 0) > 0).map((s) => (
                <Badge key={s} label={`${CONTENT_STATUS[s].label} · ${o.pipeline[s]}`} tone={CONTENT_STATUS[s].tone} icon={CONTENT_STATUS[s].icon} />
              ))}
              {Object.keys(o.pipeline).length === 0 ? (
                <Text variant="caption" tone="tertiary">
                  Hali kontent yo‘q.
                </Text>
              ) : null}
              {o.overdue_content ? <Badge label={`Muddati o‘tgan · ${o.overdue_content}`} tone="danger" icon="alert-triangle" /> : null}
            </Card>
            {o.waiting_client.oldest ? (
              <Text variant="caption" tone="tertiary">{`Mijoz tasdig‘i kutilmoqda: eng eskisi ${formatAgo(o.waiting_client.oldest)}`}</Text>
            ) : null}
          </Section>

          <Section title="Yaqin syomkalar">
            {o.shootings.length ? (
              <Card padded={false}>
                {o.shootings.map((s, i) => (
                  <ItemRow
                    key={s.id}
                    first={i === 0}
                    icon="video"
                    title={s.title}
                    subtitle={[formatShortDateTime(s.starts_at), s.location_name].filter(Boolean).join(' · ')}
                    onPress={() => nav.shooting(s.id)}
                  />
                ))}
              </Card>
            ) : (
              <Text variant="caption" tone="tertiary">
                Rejalashtirilgan syomka yo‘q.
              </Text>
            )}
          </Section>

          <Section title={`Vazifalar · ${o.tasks.open} ochiq${o.tasks.overdue ? `, ${o.tasks.overdue} kechikkan` : ''}`}>
            {o.tasks.soon.length ? (
              <Card padded={false}>
                {o.tasks.soon.map((t, i) => {
                  const late = new Date(t.due_at).getTime() < Date.now();
                  return (
                    <ItemRow
                      key={t.id}
                      first={i === 0}
                      icon="check-square"
                      title={t.title}
                      subtitle={formatRelativeDeadline(t.due_at)}
                      right={
                        late ? (
                          <Badge label="Kechikdi" tone="danger" />
                        ) : t.priority === 'high' || t.priority === 'urgent' ? (
                          <Badge label={PRIORITY[t.priority as Enums['priority_level']].label} tone={PRIORITY[t.priority as Enums['priority_level']].tone} />
                        ) : undefined
                      }
                      onPress={() => nav.task(t.id)}
                    />
                  );
                })}
              </Card>
            ) : (
              <Text variant="caption" tone="tertiary">
                Muddatli ochiq vazifa yo‘q.
              </Text>
            )}
          </Section>

          <Section title="Hisobotlar va fayllar">
            <Card padded={false}>
              {o.reports.map((r, i) => (
                <ItemRow
                  key={r.id}
                  first={i === 0}
                  icon="bar-chart-2"
                  title={formatMonthYear(r.period_month)}
                  right={<Badge label={r.status === 'published' ? 'Nashr qilingan' : 'Qoralama'} tone={r.status === 'published' ? 'success' : 'warning'} />}
                  onPress={() => nav.report(r.id)}
                />
              ))}
              <ItemRow
                first={o.reports.length === 0}
                icon="folder"
                title="Fayllar"
                subtitle={`${o.files.count} fayl · ${formatBytes(o.files.bytes) || '0 B'}`}
                onPress={() => nav.clientFiles(o.client.id)}
              />
            </Card>
          </Section>
        </>
      ) : (
        <>
          <Section title="SUN MEDIA jamoasi">
            {o.team.length ? (
              <Card padded={false}>
                {o.team.map((m, i) => (
                  <ItemRow
                    key={`${m.user_id}-${m.team_role}`}
                    first={i === 0}
                    leading={<Avatar name={m.full_name} url={m.avatar_url} size={36} />}
                    title={m.full_name}
                    subtitle={TEAM_ROLE_LABEL[m.team_role as Enums['team_role']] ?? m.team_role}
                    onPress={() => nav.employee(m.user_id)}
                  />
                ))}
              </Card>
            ) : (
              <Text variant="caption" tone="tertiary">
                Jamoa biriktirilmagan.
              </Text>
            )}
          </Section>
          <Section title="Mijoz tomonidan">
            {o.contacts.length ? (
              o.contacts.map((c) => (
                <Card key={c.user_id} style={styles.contact}>
                  <View style={styles.row}>
                    <Avatar name={c.full_name} size={40} />
                    <View style={styles.flex}>
                      <Text variant="subheading">{c.full_name}</Text>
                      <Text variant="caption" tone="secondary">
                        {[c.role_name ? (ROLE_LABEL[c.role_name] ?? c.role_name) : null, c.title, c.last_seen_at ? `oxirgi: ${formatAgo(c.last_seen_at)}` : 'hali kirmagan']
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    {c.phone ? <Button title="Qo‘ng‘iroq" icon="phone" variant="secondary" size="md" fullWidth={false} style={styles.flex} onPress={() => Linking.openURL(`tel:${c.phone}`)} /> : null}
                    {c.email ? <Button title="Email" icon="mail" variant="secondary" size="md" fullWidth={false} style={styles.flex} onPress={() => Linking.openURL(`mailto:${c.email}`)} /> : null}
                  </View>
                </Card>
              ))
            ) : (
              <Text variant="caption" tone="tertiary">
                Mijoz uchun login yaratilmagan.
              </Text>
            )}
          </Section>
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hero: { gap: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.md },
  usage: { gap: spacing.sm },
  usageRow: { gap: 6, marginBottom: spacing.xs },
  num: { fontVariant: ['tabular-nums'] },
  pipeline: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  contact: { gap: spacing.md },
});
