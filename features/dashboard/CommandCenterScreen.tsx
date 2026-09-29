import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, EmptyState, ErrorState, IconButton, ItemRow, ListGroup, ListRow, MetricGrid, QueryView, Screen, ScreenHeader, Section, Skeleton, SkeletonCards, Text } from '@/components/ui';
import { QuickCreateFab } from '@/components/navigation/QuickCreateFab';
import { CONTENT_STATUS, CONTENT_TYPE, TASK_TYPE } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { ActivityList } from '@/features/activity/ActivityList';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useAgencyDate } from '@/features/home/useAgencyDate';
import { ShootingCard } from '@/features/shootings/components/ShootingCard';
import { WorkspaceHomeSection } from '@/features/workspace/components/WorkspaceHomeSection';
import { useNav } from '@/lib/routes';
import { formatAgo, formatDateKeyLong, formatRelativeDeadline, formatShortDateTime } from '@/lib/time';
import type { Database } from '@/types/database';
import { fetchActivity, fetchCommandCenter, type CommandCenter } from './api';

type Enums = Database['public']['Enums'];

/**
 * Owner / director / admin Home: "what is happening in the agency today" in one look —
 * six numbers, then only the lists that need someone (shootings, deadlines, approvals).
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
  const { tasks, attendance, approvals, publications } = data;
  const arrived = attendance.present + attendance.late + attendance.remote;
  const waiting = approvals.client_review + approvals.internal_review;
  const urgent = data.deadlines.items.filter((d) => d.state !== 'upcoming').slice(0, 5);
  const canAttendance = can('attendance.read') || can('attendance.manage');

  return (
    <>
      <Card variant="hero" style={styles.hero}>
        <Text variant="label" tone="heroSecondary">
          Bugun
        </Text>
        <MetricGrid
          items={[
            { label: 'Syomka', value: data.shootings.length, onPress: () => nav.tab('calendar') },
            { label: 'Faol vazifa', value: tasks.in_progress + tasks.todo, onPress: () => nav.go('/tasks') },
            { label: 'Kechikkan', value: tasks.overdue, tone: tasks.overdue ? 'danger' : 'hero', onPress: () => nav.go('/tasks') },
            { label: 'Tasdiqlash', value: waiting, tone: waiting ? 'brand' : 'hero', onPress: nav.approvals },
            { label: 'Post', value: publications.scheduled + publications.published, hint: publications.delayed ? `${publications.delayed} kechikdi` : null, tone: publications.delayed ? 'danger' : 'hero' },
            {
              label: 'Davomat',
              value: `${arrived}/${attendance.employees}`,
              hint: attendance.late ? `${attendance.late} kechikdi` : null,
              tone: attendance.late ? 'warning' : 'hero',
              onPress: canAttendance ? () => nav.go('/attendance') : undefined,
            },
          ]}
        />
      </Card>

      {can('attendance.manage') && attendance.unmarked > 0 ? (
        <ListGroup>
          <ListRow
            icon="user-check"
            iconTone="warning"
            title={`${attendance.unmarked} xodim davomati belgilanmagan`}
            subtitle="Bir necha soniyada belgilang"
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

      {approvals.items.length > 0 ? (
        <Section title="Tasdiqlash kutmoqda" actionLabel="Barchasi" onAction={nav.approvals}>
          <Card padded={false}>
            {approvals.items.slice(0, 4).map((a, i) => {
              const status = CONTENT_STATUS[a.status as Enums['content_status']];
              return (
                <ItemRow
                  key={a.content_id}
                  first={i === 0}
                  icon={CONTENT_TYPE[a.content_type as Enums['content_type']]?.icon ?? 'film'}
                  title={a.title}
                  subtitle={[a.client_name, formatAgo(a.since)].join(' · ')}
                  right={status ? <Badge label={status.label} tone={status.tone} /> : undefined}
                  onPress={() => nav.content(a.content_id)}
                />
              );
            })}
          </Card>
        </Section>
      ) : null}

      <WorkspaceHomeSection userId={me.userId} />

      {data.shootings.length === 0 && urgent.length === 0 && approvals.items.length === 0 ? (
        <EmptyState icon="sun" title="Bugun hammasi joyida" description="Syomka, kechikkan ish yoki tasdiqlash kutayotgan kontent yo‘q." />
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
