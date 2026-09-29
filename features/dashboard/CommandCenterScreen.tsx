import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, EmptyState, ErrorState, IconButton, ItemRow, ListGroup, ListRow, MetricGrid, QueryView, Screen, ScreenHeader, Section, Skeleton, SkeletonCards, Text } from '@/components/ui';
import { QuickCreateFab } from '@/components/navigation/QuickCreateFab';
import { CONTENT_STATUS, TASK_TYPE } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { ActivityList } from '@/features/activity/ActivityList';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useAgencyDate } from '@/features/home/useAgencyDate';
import { ShootingCard } from '@/features/shootings/components/ShootingCard';
import { WorkspaceHomeSection } from '@/features/workspace/components/WorkspaceHomeSection';
import { useNav } from '@/lib/routes';
import { formatAgo, formatDateKeyLong, formatRelativeDeadline, formatShortDateTime } from '@/lib/time';
import type { Database } from '@/types/database';
import { fetchClientConversations } from '@/features/inbox/api';
import { fetchActivity, fetchCommandCenter, fetchProblemContent, type CommandCenter } from './api';

type Enums = Database['public']['Enums'];

/**
 * Admin / Rahbar Home: "what needs managing today" in one look — eight numbers, then only the lists that need
 * someone (shootings, deadlines, clients waiting for an answer, problem work). The Rahbar sees the same
 * picture read-only: permissions hide every action they do not hold.
 */
export function CommandCenterScreen() {
  const today = useAgencyDate();
  const query = useQuery({
    queryKey: ['dashboard', 'command-center', today],
    queryFn: () => fetchCommandCenter(today),
    // Overdue and "critical" windows move with the clock even when no row changes.
    refetchInterval: 60_000,
  });
  const activity = useQuery({ queryKey: ['dashboard', 'activity', 'recent'], queryFn: () => fetchActivity({ limit: 5 }) });
  const nav = useNav();

  return (
    <View style={styles.fill}>
      <Screen
        refreshing={query.isRefetching || activity.isRefetching}
        onRefresh={() => {
          query.refetch();
          activity.refetch();
        }}
        contentStyle={styles.fabSpace}
      >
        <ScreenHeader eyebrow={formatDateKeyLong(today)} title="Bugun agentlikda" right={<IconButton icon="search" label="Qidiruv" onPress={() => nav.go('/search')} />} />
        <QueryView query={query} skeleton={<DashboardSkeleton />}>
          {(data) => <Body data={data} />}
        </QueryView>
        <Section title="So‘nggi faollik">
          <QueryView query={activity} skeleton={<SkeletonCards count={1} />}>
            {(items) => (items.length > 0 ? <ActivityList items={items} /> : <Text variant="caption" tone="tertiary">Bugun hali hech narsa o‘zgarmadi.</Text>)}
          </QueryView>
          {activity.error && activity.data ? <ErrorState error={activity.error} onRetry={() => activity.refetch()} /> : null}
        </Section>
      </Screen>
      <QuickCreateFab />
    </View>
  );
}

function Body({ data }: { data: CommandCenter }) {
  const me = useMe();
  const { can } = useAuth();
  const nav = useNav();
  const { tasks, attendance, publications } = data;
  const urgent = data.deadlines.items.filter((d) => d.state !== 'upcoming').slice(0, 5);
  const canAttendance = can('attendance.read') || can('attendance.manage');
  const seesChats = can('chat.manage') || can('chat.observe');
  const chats = useQuery({ queryKey: ['chat', 'client-conversations'], queryFn: fetchClientConversations, enabled: seesChats, refetchInterval: 60_000 });
  const waiting = (chats.data ?? []).filter((c) => c.awaiting_reply);
  const problems = useQuery({ queryKey: ['dashboard', 'problems'], queryFn: fetchProblemContent });

  return (
    <>
      <Card variant="hero" style={styles.hero}>
        <Text variant="label" tone="heroSecondary">
          Bugun
        </Text>
        <MetricGrid
          columns={4}
          items={[
            { label: 'Syomka', value: data.shootings.length, onPress: () => nav.tab('studio') },
            { label: 'Aktiv vazifa', value: tasks.in_progress + tasks.todo, onPress: () => nav.tab('studio') },
            { label: 'Kechikkan', value: tasks.overdue, tone: tasks.overdue ? 'danger' : 'hero', onPress: () => nav.tab('studio') },
            { label: 'Bugungi post', value: publications.scheduled + publications.published },
            { label: 'Keldi', value: attendance.present + attendance.late + attendance.remote, onPress: canAttendance ? () => nav.go('/attendance') : undefined },
            { label: 'Kechikdi', value: attendance.late, tone: attendance.late ? 'warning' : 'hero', onPress: canAttendance ? () => nav.go('/attendance') : undefined },
            { label: 'Kelmadi', value: attendance.absent, tone: attendance.absent ? 'danger' : 'hero', onPress: canAttendance ? () => nav.go('/attendance') : undefined },
            { label: 'Javobsiz xabar', value: seesChats ? waiting.length : '—', tone: waiting.length ? 'brand' : 'hero', onPress: () => nav.tab('inbox') },
          ]}
        />
      </Card>

      {can('attendance.manage') && attendance.unmarked > 0 ? (
        <ListGroup>
          <ListRow
            icon="user-check"
            iconTone="warning"
            title={`${attendance.unmarked} xodim davomati belgilanmagan`}
            subtitle="Keldi / Kechikdi / Kelmadi — bir bosishda"
            onPress={() => nav.go('/attendance')}
          />
        </ListGroup>
      ) : null}

      {data.shootings.length > 0 ? (
        <Section title="Bugungi syomkalar">
          {data.shootings.map((s) => (
            <ShootingCard key={s.id} shooting={s} onPress={() => nav.shooting(s.id)} />
          ))}
        </Section>
      ) : null}

      {urgent.length > 0 ? (
        <Section title="Muhim muddatlar" actionLabel="Vazifalar" onAction={() => nav.go('/tasks')}>
          <Card padded={false}>
            {urgent.map((d, i) => (
              <ItemRow
                key={d.task_id}
                first={i === 0}
                icon={TASK_TYPE[d.task_type as Enums['task_type']]?.icon ?? 'check-square'}
                title={d.title}
                subtitle={[d.client_name, d.assignees.map((a) => a.full_name.split(' ')[0]).join(', ') || null, formatShortDateTime(d.due_at)].filter(Boolean).join(' · ')}
                right={<Badge label={d.state === 'overdue' ? 'Kechikdi' : (formatRelativeDeadline(d.due_at) ?? 'Bugun')} tone={d.state === 'overdue' ? 'danger' : 'warning'} />}
                onPress={() => nav.task(d.task_id)}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      {waiting.length > 0 ? (
        <Section title="Javob kutayotgan mijozlar" actionLabel="Xabarlar" onAction={() => nav.tab('inbox')}>
          <Card padded={false}>
            {waiting.slice(0, 5).map((c, i) => (
              <ItemRow
                key={c.room_id}
                first={i === 0}
                icon="message-circle"
                title={c.client_name}
                subtitle={[c.last_message_body || 'Fayl', c.last_message_at ? formatAgo(c.last_message_at) : null].filter(Boolean).join(' · ')}
                right={<Badge label={c.is_member ? 'Javob bering' : 'Kutmoqda'} tone="warning" />}
                onPress={() => nav.chat(c.room_id)}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      {(problems.data ?? []).length > 0 ? (
        <Section title="Muammoli ishlar" actionLabel="Ishlar" onAction={() => nav.tab('studio')}>
          <Card padded={false}>
            {(problems.data ?? []).map((c, i) => {
              const status = CONTENT_STATUS[c.status];
              const late = c.status !== 'revision';
              return (
                <ItemRow
                  key={c.id}
                  first={i === 0}
                  icon={late ? 'alert-triangle' : 'rotate-ccw'}
                  title={c.title}
                  subtitle={[c.client?.name, c.team.map((t) => t.person?.full_name.split(' ')[0]).filter(Boolean).join(', ') || null, c.due_at ? formatShortDateTime(c.due_at) : null].filter(Boolean).join(' · ')}
                  right={<Badge label={late ? 'Kechikdi' : status.label} tone="danger" />}
                  onPress={() => nav.content(c.id)}
                />
              );
            })}
          </Card>
        </Section>
      ) : null}

      <WorkspaceHomeSection userId={me.userId} />

      {data.shootings.length === 0 && urgent.length === 0 && waiting.length === 0 && !(problems.data ?? []).length ? (
        <EmptyState icon="sun" title="Bugun hammasi joyida" description="Syomka, kechikkan ish yoki javob kutayotgan mijoz yo‘q." />
      ) : null}
    </>
  );
}

function DashboardSkeleton() {
  return (
    <View style={styles.skeleton}>
      <Skeleton height={190} rounded={16} />
      <SkeletonCards count={3} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: { gap: spacing.lg },
  fill: { flex: 1 },
  fabSpace: { paddingBottom: 120 },
  hero: { gap: spacing.md, padding: spacing.lg },
});
