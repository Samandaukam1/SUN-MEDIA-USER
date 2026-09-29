import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  ErrorState,
  IconButton,
  ItemRow,
  MetricGrid,
  QueryView,
  Screen,
  ScreenHeader,
  Section,
  Skeleton,
  SkeletonCards,
  Text,
} from '@/components/ui';
import { CONTENT_TYPE } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { formatDateKeyLong, formatMonthYear, formatShortDateTime } from '@/lib/time';
import { useNav } from '@/lib/routes';
import type { CalendarEvent } from '@/lib/schemas';
import type { ClientMembership } from '@/types/app';
import type { Database } from '@/types/database';
import { fetchClientHome, fetchClientToday, type ClientHome as ClientHomeData, type ClientToday } from './api';
import { EventTimeline } from './components/EventTimeline';
import { TodayPlanCard } from './components/TodayPlanCard';
import { useAgencyDate } from './useAgencyDate';

type Enums = Database['public']['Enums'];

/**
 * Client Home, in the order a client asks: is anything waiting for me, what happens today, when is the next
 * shooting, and what did SUN MEDIA deliver this month. Team, plan details and notifications live elsewhere.
 */
export function ClientHome() {
  const me = useMe();
  const nav = useNav();
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
      onRefresh={
        client
          ? () => {
              home.refetch();
              shootings.refetch();
            }
          : undefined
      }
    >
      <ScreenHeader
        eyebrow={formatDateKeyLong(today)}
        // Greet the person; the company account (named after the brand) gets the brand name.
        title={`Assalomu alaykum, ${me.profile?.full_name?.split(' ')[0] || client?.name || ''}`}
        right={<IconButton icon="search" label="Qidiruv" onPress={() => nav.go('/search')} />}
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
          {(data) => <Body data={data} shootings={shootings} client={client} />}
        </QueryView>
      ) : (
        <EmptyState icon="briefcase" title="Kompaniya biriktirilmagan" description="Administrator kompaniyangizni biriktirgach, ish rejangiz shu yerda ko‘rinadi." />
      )}
    </Screen>
  );
}

function Body({ data, shootings, client }: { data: ClientHomeData; shootings: UseQueryResult<ClientToday>; client: ClientMembership }) {
  const nav = useNav();
  const openEvent = (e: CalendarEvent) => (e.event_type === 'shooting' ? nav.shooting(e.entity_id) : e.content_id ? nav.content(e.content_id) : undefined);
  const canPlan = client.permissions.includes('client.plan.view');
  const canReports = client.permissions.includes('client.reports.view');
  const delivered = Object.entries(data.month_delivered)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${CONTENT_TYPE[type as Enums['content_type']]?.label ?? type}: ${count}`)
    .join(' · ');
  const nextShooting = data.upcoming.find((e) => e.event_type === 'shooting');
  const upcoming = data.upcoming.slice(0, 5);

  return (
    <>
      <ApprovalCard data={data} />

      <Card variant="hero" style={styles.hero}>
        <View style={styles.heroTop}>
          <Text variant="label" tone="heroSecondary">
            {formatMonthYear(data.date)} · SUN MEDIA siz uchun
          </Text>
          {canPlan && data.subscription ? (
            <Text variant="label" tone="brand">
              {data.subscription.plan_name}
            </Text>
          ) : null}
        </View>
        <MetricGrid
          items={[
            { label: 'Joylandi', value: data.stats.published_month },
            { label: 'Syomka', value: data.stats.shootings_month },
            { label: 'Jarayonda', value: data.stats.in_production, onPress: () => nav.tab('studio') },
          ]}
        />
        <Text variant="caption" tone="heroSecondary">
          {delivered || 'Bu oy hali kontent joylanmadi.'}
        </Text>
        {canPlan || canReports ? (
          <View style={styles.heroLinks}>
            {canPlan ? <HeroLink label="Tarifim" onPress={() => nav.go('/plan')} /> : null}
            {canReports ? <HeroLink label="Oylik hisobot" onPress={() => nav.go('/reports')} /> : null}
          </View>
        ) : null}
      </Card>

      <Section title="Bugun">
        {data.today.length === 0 ? (
          <Text variant="caption" tone="tertiary">
            Bugun syomka, tasdiqlash yoki post rejalashtirilmagan.
          </Text>
        ) : (
          <EventTimeline events={data.today} onPress={openEvent} />
        )}
      </Section>

      <QueryView query={shootings} skeleton={<SkeletonCards count={1} />}>
        {(plan) =>
          plan.shootings.length > 0 ? (
            <Section title="Bugungi syomka">
              {plan.shootings.map((shooting) => (
                <TodayPlanCard key={shooting.id} shooting={shooting} contents={plan.contents.filter((c) => c.shooting_id === shooting.id)} onPress={() => nav.shooting(shooting.id)} />
              ))}
            </Section>
          ) : nextShooting ? (
            <Section title="Keyingi syomka">
              <Card padded={false}>
                <ItemRow
                  first
                  icon="video"
                  title={nextShooting.title}
                  subtitle={[formatShortDateTime(nextShooting.starts_at), nextShooting.location_name].filter(Boolean).join(' · ')}
                  onPress={() => nav.shooting(nextShooting.entity_id)}
                />
              </Card>
            </Section>
          ) : null
        }
      </QueryView>
      {shootings.error && shootings.data ? <ErrorState error={shootings.error} onRetry={() => shootings.refetch()} /> : null}

      {upcoming.length > 0 ? (
        <Section title="Yaqin kunlarda" actionLabel="Kalendar" onAction={() => nav.tab('calendar')}>
          <EventTimeline events={upcoming} withDate onPress={openEvent} />
        </Section>
      ) : null}
    </>
  );
}

/** What waits for the client's decision — the one action that matters most, so it comes first. */
function ApprovalCard({ data }: { data: ClientHomeData }) {
  const nav = useNav();
  const items = data.awaiting_approval;
  if (items.length === 0) return null;
  const [first, ...rest] = items;
  const open = (item: (typeof items)[number]) => (item.version ? nav.review(item.version.id) : nav.content(item.content_id));
  return (
    <Card style={styles.approval}>
      <Text variant="label" tone="warning">
        Tasdiqlashingiz kerak · {data.stats.waiting_approval}
      </Text>
      <Text variant="heading" numberOfLines={2}>
        {first.title}
      </Text>
      <Text variant="caption" tone="secondary">
        {[CONTENT_TYPE[first.content_type as Enums['content_type']]?.label, first.due_at ? `Javob: ${formatShortDateTime(first.due_at)}` : null].filter(Boolean).join(' · ')}
      </Text>
      <Button title="Ko‘rish va tasdiqlash" icon="play-circle" onPress={() => open(first)} />
      {rest.length > 0 ? (
        <Card padded={false} variant="sunken">
          {rest.slice(0, 3).map((item, i) => (
            <ItemRow key={item.content_id} first={i === 0} icon={CONTENT_TYPE[item.content_type as Enums['content_type']]?.icon ?? 'film'} title={item.title} onPress={() => open(item)} />
          ))}
        </Card>
      ) : null}
      {data.stats.waiting_approval > 1 ? <Button title="Hammasini ko‘rish" variant="ghost" size="md" onPress={nav.approvals} /> : null}
    </Card>
  );
}

function HeroLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.heroLink, pressed && styles.pressed]}>
      <Text variant="captionMedium" tone="hero">
        {label} →
      </Text>
    </Pressable>
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
  hero: { gap: spacing.md, padding: spacing.lg },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  heroLinks: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.xs },
  heroLink: { paddingVertical: 2 },
  pressed: { opacity: 0.6 },
  approval: { gap: spacing.sm },
  skeleton: { gap: spacing.lg },
});
