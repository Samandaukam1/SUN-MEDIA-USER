import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Avatar,
  Badge,
  Card,
  Chip,
  ChipRow,
  Counters,
  EmptyState,
  ErrorState,
  ItemRow,
  QueryView,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  SkeletonCards,
  Text,
} from '@/components/ui';
import { CONTENT_TYPE, TEAM_ROLE_LABEL } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { formatAgo, formatDateKeyLong, formatShortDateTime, formatMonthYear } from '@/lib/time';
import { useNav } from '@/lib/routes';
import type { CalendarEvent } from '@/lib/schemas';
import type { Database } from '@/types/database';
import { fetchClientHome, fetchClientToday, type ClientHome as ClientHomeData, type ClientToday } from './api';
import { EventTimeline } from './components/EventTimeline';
import { PlanHero } from './components/PlanHero';
import { TodayPlanCard } from './components/TodayPlanCard';
import { UsageList } from './components/UsageList';
import { useAgencyDate } from './useAgencyDate';

type Enums = Database['public']['Enums'];

export function ClientHome() {
  const me = useMe();
  const [clientId, setClientId] = useState(me.clients[0]?.id);
  const client = me.clients.find((c) => c.id === clientId) ?? me.clients[0];
  const today = useAgencyDate();

  const home = useQuery({
    queryKey: ['home', 'client', client?.id, today],
    queryFn: () => fetchClientHome(client!.id),
    enabled: !!client,
  });
  const shootings = useQuery({
    queryKey: ['home', 'client', client?.id, 'today', today],
    queryFn: () => fetchClientToday(client!.id, today),
    enabled: !!client,
  });

  return (
    <Screen
      refreshing={home.isRefetching || shootings.isRefetching}
      onRefresh={client ? () => {
        home.refetch();
        shootings.refetch();
      } : undefined}
    >
      <ScreenHeader
        eyebrow={formatDateKeyLong(today)}
        title={`Assalomu alaykum, ${client?.name ?? me.profile?.full_name ?? ''}`}
        right={client ? <Avatar name={client.name} url={client.logo_url} size={40} /> : undefined}
      />

      {me.clients.length > 1 ? (
        <ChipRow>
          {me.clients.map((c) => (
            <Chip key={c.id} label={c.name} selected={c.id === client?.id} onPress={() => setClientId(c.id)} />
          ))}
        </ChipRow>
      ) : null}

      {client ? (
        <QueryView query={home} skeleton={<HomeSkeleton />}>
          {(data) => <Body data={data} shootings={shootings} />}
        </QueryView>
      ) : (
        <EmptyState icon="briefcase" title="Kompaniya biriktirilmagan" description="Administrator kompaniyangizni biriktirgach, ish rejangiz shu yerda ko‘rinadi." />
      )}
    </Screen>
  );
}

function Body({ data, shootings }: { data: ClientHomeData; shootings: UseQueryResult<ClientToday> }) {
  const nav = useNav();
  const openEvent = (e: CalendarEvent) => (e.event_type === 'shooting' ? nav.shooting(e.entity_id) : e.content_id ? nav.content(e.content_id) : undefined);
  const delivered = Object.entries(data.month_delivered).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PlanHero home={data} />

      <Section title="Bugun">
        {data.today.length === 0 ? (
          <EmptyState icon="sun" title="Bugun rejalashtirilgan ish yo‘q" description="Syomka, montaj, tasdiqlash va nashrlar shu yerda vaqti bilan ko‘rinadi." />
        ) : (
          <EventTimeline events={data.today} onPress={openEvent} />
        )}
      </Section>

      <Section title="Bugungi syomka">
        <QueryView query={shootings} skeleton={<SkeletonCards count={1} />}>
          {(plan) => plan.shootings.length > 0 ? (
            plan.shootings.map((shooting) => (
              <TodayPlanCard key={shooting.id} shooting={shooting} contents={plan.contents.filter((c) => c.shooting_id === shooting.id)} />
            ))
          ) : (
            <Text variant="caption" tone="tertiary">Bugun syomka rejalashtirilmagan.</Text>
          )}
        </QueryView>
        {shootings.error && shootings.data ? <ErrorState error={shootings.error} onRetry={() => shootings.refetch()} /> : null}
      </Section>

      {data.awaiting_approval.length > 0 ? (
        <Section title={`Tasdiq kutmoqda · ${data.stats.waiting_approval}`} actionLabel="Hammasi" onAction={nav.approvals}>
          <Card padded={false}>
            {data.awaiting_approval.map((item, i) => (
              <ItemRow
                key={item.content_id}
                first={i === 0}
                icon={CONTENT_TYPE[item.content_type as Enums['content_type']]?.icon ?? 'film'}
                title={item.title}
                subtitle={[
                  item.version ? `v${item.version.version_number}` : null,
                  item.due_at ? `Muddat: ${formatShortDateTime(item.due_at)}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                right={<Badge label="Ko‘rib chiqing" tone="warning" />}
                onPress={() => (item.version ? nav.review(item.version.id) : nav.content(item.content_id))}
              />
            ))}
          </Card>
          {data.stats.waiting_approval > data.awaiting_approval.length ? (
            <Text variant="caption" tone="tertiary">{data.stats.waiting_approval} tadan {data.awaiting_approval.length} tasi ko‘rsatilmoqda.</Text>
          ) : null}
        </Section>
      ) : null}

      {data.subscription ? (
        <Section title="Tarif bo‘yicha foydalanish">
          <UsageList usage={data.usage} limit={5} />
        </Section>
      ) : null}

      <Section title={formatMonthYear(data.date)}>
        <Card style={styles.month}>
          <Counters
            items={[
              { label: 'Joylandi', value: data.stats.published_month },
              { label: 'Syomkalar', value: data.stats.shootings_month },
              { label: 'Jarayonda', value: data.stats.in_production },
            ]}
          />
          {delivered.length > 0 ? (
            <View style={styles.delivered}>
              {delivered.map(([type, count]) => (
                <Badge key={type} label={`${CONTENT_TYPE[type as Enums['content_type']]?.label ?? type}: ${count}`} icon={CONTENT_TYPE[type as Enums['content_type']]?.icon} />
              ))}
            </View>
          ) : (
            <Text variant="caption" tone="tertiary">
              Bu oy hali kontent joylanmadi.
            </Text>
          )}
        </Card>
      </Section>

      {data.upcoming.length > 0 ? (
        <Section title="Yaqin kunlarda">
          <EventTimeline events={data.upcoming} withDate onPress={openEvent} />
        </Section>
      ) : null}

      {data.team.length > 0 ? (
        <Section title="Sizning jamoangiz">
          <Card padded={false}>
            {data.team.map((m, i) => (
              <ItemRow
                key={`${m.user_id}:${m.team_role}`}
                first={i === 0}
                leading={<Avatar name={m.full_name} url={m.avatar_url} size={32} />}
                title={m.full_name}
                subtitle={TEAM_ROLE_LABEL[m.team_role as Enums['team_role']] ?? m.team_role}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      {data.notifications.length > 0 ? (
        <Section title={`Bildirishnomalar${data.unread_notifications ? ` · ${data.unread_notifications} yangi` : ''}`}>
          <Card padded={false}>
            {data.notifications.slice(0, 3).map((n, i) => (
              <ItemRow
                key={n.id}
                first={i === 0}
                icon="bell"
                title={n.title}
                subtitle={[n.body, formatAgo(n.created_at)].filter(Boolean).join(' · ')}
                right={n.read_at ? undefined : <Badge label="Yangi" tone="accent" />}
              />
            ))}
          </Card>
        </Section>
      ) : null}
    </>
  );
}

function HomeSkeleton() {
  return (
    <View style={styles.skeleton}>
      <Skeleton height={168} rounded={16} />
      <SkeletonCards count={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  month: { gap: spacing.lg },
  delivered: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skeleton: { gap: spacing.lg },
});
