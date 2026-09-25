import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, EmptyState, ErrorState, Screen, Section, SkeletonCards, Text } from '@/components/ui';
import { SHOOTING_STATUS, TEAM_ROLE_LABEL } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { agencyDateKey, agencyDayRange, formatDateKeyLong, formatTime, greetingForNow } from '@/lib/time';
import { fetchEmployeeToday, type EmployeeToday } from './api';
import { InfoRow } from './components/InfoRow';
import { TaskRow } from './components/TaskRow';

export function EmployeeHome() {
  const me = useMe();
  const today = agencyDateKey();
  const query = useQuery({
    queryKey: ['home', 'employee', me.userId, today],
    queryFn: () => fetchEmployeeToday(me.userId, today),
  });
  const firstName = me.profile?.full_name.split(' ')[0] ?? '';

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <View style={styles.greeting}>
        <Text variant="caption" tone="tertiary">
          {formatDateKeyLong(today)}
        </Text>
        <Text variant="display">
          {greetingForNow()}, {firstName}
        </Text>
      </View>
      {query.isPending ? (
        <SkeletonCards count={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <EmployeeAgenda data={query.data} today={today} />
      )}
    </Screen>
  );
}

function EmployeeAgenda({ data, today }: { data: EmployeeToday; today: string }) {
  const { to } = agencyDayRange(today);
  const now = Date.now();
  const overdue = data.tasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < now);
  const dueToday = data.tasks.filter((t) => t.due_at && new Date(t.due_at).getTime() >= now && t.due_at < to);
  const later = data.tasks.filter((t) => !t.due_at || t.due_at >= to);

  if (data.shootings.length === 0 && data.tasks.length === 0) {
    return <EmptyState icon="check-circle" title="Bugun uchun vazifa yo‘q" description="Yangi vazifa biriktirilganda bildirishnoma olasiz." />;
  }

  return (
    <>
      {data.shootings.length > 0 ? (
        <Section title="Bugungi syomkalar">
          {data.shootings.map((s) => (
            <ShootingCard key={s.id} shooting={s} />
          ))}
        </Section>
      ) : null}
      {overdue.length > 0 ? (
        <Section title={`Muddati o‘tgan · ${overdue.length}`}>
          {overdue.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </Section>
      ) : null}
      {dueToday.length > 0 ? (
        <Section title="Bugun topshiriladi">
          {dueToday.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </Section>
      ) : null}
      {later.length > 0 ? (
        <Section title="Keyingi vazifalar">
          {later.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </Section>
      ) : null}
    </>
  );
}

function ShootingCard({ shooting }: { shooting: EmployeeToday['shootings'][number] }) {
  const { colors } = useTheme();
  const status = SHOOTING_STATUS[shooting.status];
  const myRole = shooting.mine[0]?.role;
  return (
    <Card>
      <View style={styles.shootingHeader}>
        <View style={[styles.time, { backgroundColor: colors.accentSoft }]}>
          <Text variant="heading" tone="accent">
            {formatTime(shooting.starts_at)}
          </Text>
        </View>
        <View style={styles.flex}>
          <View style={styles.labelRow}>
            <Text variant="label" tone="tertiary">
              {shooting.client?.name}
            </Text>
            <Badge label={status.label} tone={status.tone} />
          </View>
          <Text variant="heading" numberOfLines={2}>
            {shooting.title}
          </Text>
        </View>
      </View>
      <View style={styles.rows}>
        <InfoRow icon="map-pin" label="Lokatsiya" value={shooting.location_name ?? shooting.location_address} />
        <InfoRow icon="clock" label="Vaqt" value={`${formatTime(shooting.starts_at)} – ${formatTime(shooting.ends_at)}`} />
        <InfoRow icon="user" label="Rolingiz" value={myRole ? TEAM_ROLE_LABEL[myRole] : null} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: spacing.xs },
  shootingHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  time: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  flex: { flex: 1, gap: 4 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rows: { gap: spacing.sm + 2, marginTop: spacing.lg },
});
