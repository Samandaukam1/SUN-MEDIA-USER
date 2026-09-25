import { useQuery } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';

import { Badge, Card, Counters, EmptyState, Icon, ItemRow, QueryView, Screen, ScreenHeader, Section, Text } from '@/components/ui';
import { ATTENDANCE_STATUS, CONTENT_STATUS, CONTENT_TYPE, TEAM_ROLE_LABEL } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { ShootingCard } from '@/features/shootings/components/ShootingCard';
import { TaskCard } from '@/features/tasks/components/TaskCard';
import { WorkspaceHomeSection } from '@/features/workspace/components/WorkspaceHomeSection';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { agencyDateKey, formatDateKeyLong, formatShortDateTime, greetingForNow } from '@/lib/time';
import type { Database } from '@/types/database';
import { fetchEmployeeHome, type EmployeeHome as EmployeeHomeData } from './api';
import { useAgencyDate } from './useAgencyDate';

type Enums = Database['public']['Enums'];

export function EmployeeHome() {
  const me = useMe();
  const today = useAgencyDate();
  const query = useQuery({ queryKey: ['home', 'employee', me.userId, today], queryFn: fetchEmployeeHome, refetchInterval: 60_000 });
  const firstName = me.profile?.full_name.split(' ')[0] ?? '';

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <ScreenHeader
        eyebrow={formatDateKeyLong(today)}
        title={`${greetingForNow()}, ${firstName}`}
        subtitle={me.employee?.job_title ?? me.roles[0]?.name}
      />
      <QueryView query={query}>{(data) => <Agenda data={data} userId={me.userId} />}</QueryView>
    </Screen>
  );
}

function Agenda({ data, userId }: { data: EmployeeHomeData; userId: string }) {
  const { colors } = useTheme();
  const nav = useNav();
  const today = data.date;
  const shootingsToday = data.shootings.filter((s) => agencyDateKey(s.starts_at) === today);
  const shootingsTomorrow = data.shootings.filter((s) => agencyDateKey(s.starts_at) !== today);
  const attendance = data.attendance ? ATTENDANCE_STATUS[data.attendance.status as Enums['attendance_status']] : null;

  return (
    <>
      <Card variant="hero" style={styles.hero}>
        <Text variant="label" tone="heroSecondary">
          Bugungi fokus
        </Text>
        <Counters
          onHero
          items={[
            { label: 'Bugun muddat', value: data.task_stats.due_today },
            { label: 'Muddati o‘tgan', value: data.task_stats.overdue, tone: data.task_stats.overdue ? 'danger' : 'hero' },
            { label: 'Jarayonda', value: data.task_stats.in_progress },
            { label: 'Bajarildi', value: data.task_stats.done_today, tone: data.task_stats.done_today ? 'brand' : 'hero' },
          ]}
        />
      </Card>

      {/* Attendance is marked by the office (owner / admin / manager); employees only see the result. */}
      <Card variant="sunken" style={styles.attendance} accessibilityLabel="Bugungi davomat">
        <Icon name={attendance?.icon ?? 'clock'} size={16} color={colors.textSecondary} />
        <Text variant="caption" tone="secondary" style={styles.flex}>
          Bugungi davomat
        </Text>
        {attendance ? (
          <Badge
            label={`${attendance.label}${data.attendance?.arrived_at ? ` · ${data.attendance.arrived_at.slice(0, 5)}` : ''}${data.attendance?.late_minutes ? ` · ${data.attendance.late_minutes} daq` : ''}`}
            tone={attendance.tone}
          />
        ) : (
          <Text variant="caption" tone="tertiary">
            Administrator belgilaydi
          </Text>
        )}
      </Card>

      <WorkspaceHomeSection userId={userId} />

      {shootingsToday.length > 0 ? (
        <Section title="Bugungi syomkalar">
          {shootingsToday.map((s) => (
            <ShootingCard key={s.id} shooting={{ ...s, members: s.crew.map((c) => ({ ...c, attendance: c.user_id === userId ? s.my_attendance : null })) }} onPress={() => nav.shooting(s.id)} />
          ))}
        </Section>
      ) : null}

      <Section title={`Vazifalarim · ${data.task_stats.open}`}>
        {data.tasks.length === 0 ? (
          <EmptyState icon="check-circle" title="Yaqin kunlarga vazifa yo‘q" description="Yangi vazifa biriktirilganda bildirishnoma olasiz." />
        ) : (
          data.tasks.map((t) => <TaskCard key={t.id} task={t} />)
        )}
      </Section>

      {data.content.length > 0 ? (
        <Section title="Ishlayotgan kontentlarim">
          <Card padded={false}>
            {data.content.map((c, i) => {
              const status = CONTENT_STATUS[c.status as Enums['content_status']];
              return (
                <ItemRow
                  key={c.id}
                  first={i === 0}
                  icon={CONTENT_TYPE[c.content_type as Enums['content_type']]?.icon ?? 'film'}
                  title={c.title}
                  subtitle={[
                    c.client_name,
                    c.my_role ? TEAM_ROLE_LABEL[c.my_role as Enums['team_role']] ?? c.my_role : null,
                    c.due_at ? formatShortDateTime(c.due_at) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  right={<Badge label={status.label} tone={status.tone} />}
                  onPress={() => nav.content(c.id)}
                />
              );
            })}
          </Card>
        </Section>
      ) : null}

      {shootingsTomorrow.length > 0 ? (
        <Section title="Ertangi syomkalar">
          {shootingsTomorrow.map((s) => (
            <ShootingCard key={s.id} shooting={{ ...s, members: s.crew }} onPress={() => nav.shooting(s.id)} />
          ))}
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.lg, padding: spacing.xl },
  attendance: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  flex: { flex: 1 },
});
