import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { EmptyState, ErrorState, QueryView, Screen, ScreenHeader, Section, Skeleton, SkeletonCards, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { ActivityList } from '@/features/activity/ActivityList';
import { useMe } from '@/features/auth/AuthProvider';
import { useNav } from '@/lib/routes';
import { WorkspaceHomeSection } from '@/features/workspace/components/WorkspaceHomeSection';
import { useAgencyDate } from '@/features/home/useAgencyDate';
import { formatDateKeyLong } from '@/lib/time';
import { fetchActivity, fetchCommandCenter, type CommandCenter } from './api';
import { ApprovalsCard } from './components/ApprovalsCard';
import { AttendanceCard } from './components/AttendanceCard';
import { ClientStatusList } from './components/ClientStatusList';
import { DashboardHero } from './components/DashboardHero';
import { DeadlineRadar } from './components/DeadlineRadar';
import { PublicationsCard } from './components/PublicationsCard';
import { ShootingCard } from '@/features/shootings/components/ShootingCard';

/** Owner / Director / Admin daily command center — every number comes from get_command_center. */
export function CommandCenterScreen() {
  const today = useAgencyDate();
  const query = useQuery({
    queryKey: ['dashboard', 'command-center', today],
    queryFn: () => fetchCommandCenter(today),
    // Overdue and "critical" windows move with the clock even when no row changes.
    refetchInterval: 60_000,
  });
  const activity = useQuery({ queryKey: ['dashboard', 'activity', 'recent'], queryFn: () => fetchActivity({ limit: 8 }) });

  return (
    <Screen
      refreshing={query.isRefetching || activity.isRefetching}
      onRefresh={() => {
        query.refetch();
        activity.refetch();
      }}
    >
      <ScreenHeader eyebrow={formatDateKeyLong(today)} title="Bugun agentlikda" />
      <QueryView query={query} skeleton={<DashboardSkeleton />}>
        {(data) => <Body data={data} />}
      </QueryView>
      <Section title="So‘nggi faoliyat">
        <QueryView query={activity} skeleton={<SkeletonCards count={1} />}>
          {(items) => items.length > 0 ? <ActivityList items={items} /> : <Text variant="caption" tone="tertiary">Hali faoliyat qayd etilmagan.</Text>}
        </QueryView>
        {activity.error && activity.data ? <ErrorState error={activity.error} onRetry={() => activity.refetch()} /> : null}
      </Section>
    </Screen>
  );
}

function Body({ data }: { data: CommandCenter }) {
  const me = useMe();
  const nav = useNav();
  return (
    <>
      <DashboardHero data={data} />

      <WorkspaceHomeSection userId={me.userId} />

      <Section title={`Davomat · ${data.attendance.employees} xodim`}>
        <AttendanceCard attendance={data.attendance} />
      </Section>

      <Section title={`Bugungi syomkalar · ${data.shootings.length}`}>
        {data.shootings.length === 0 ? (
          <EmptyState icon="video-off" title="Bugun syomka yo‘q" description="Rejalashtirilgan syomkalar shu yerda ko‘rinadi." />
        ) : (
          data.shootings.map((s) => <ShootingCard key={s.id} shooting={s} onPress={() => nav.shooting(s.id)} />)
        )}
      </Section>

      <Section title="Yaqin muddatlar">
        <DeadlineRadar deadlines={data.deadlines} onOpenTask={(taskId) => { const d = data.deadlines.items.find((x) => x.task_id === taskId); if (d?.content_id) nav.content(d.content_id); }} />
      </Section>

      <Section title="Tasdiqlash">
        <ApprovalsCard approvals={data.approvals} onOpenContent={nav.content} />
      </Section>

      <Section title="Bugungi nashrlar">
        <PublicationsCard publications={data.publications} onOpenContent={nav.content} />
      </Section>

      {data.clients.length > 0 ? (
        <Section title={`Mijozlar holati · ${data.clients.length}`}>
          <ClientStatusList clients={data.clients} />
        </Section>
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

const styles = StyleSheet.create({ skeleton: { gap: spacing.lg } });
