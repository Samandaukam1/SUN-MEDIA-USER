import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Chip, ChipRow, Counters, EmptyState, ItemRow, QueryView, Screen, Section, Text, useToast } from '@/components/ui';
import { ATTENDANCE_STATUS } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { fetchAttendanceMonth } from '@/features/attendance/api';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { openDirectChat } from '@/features/inbox/api';
import { fetchScorecards } from '@/features/performance/api';
import { MonthSwitcher } from '@/features/performance/MonthSwitcher';
import { monthRange } from '@/features/performance/PerformanceScreen';
import { ScorecardView } from '@/features/performance/ScorecardView';
import { fetchTasks, OPEN_STATUSES, TASK_PAGE } from '@/features/tasks/api';
import { TaskCard } from '@/features/tasks/components/TaskCard';
import { toSummary } from '@/features/tasks/TasksScreen';
import { useNav } from '@/lib/routes';
import { agencyDateKey, formatDateKey, monthStartKey } from '@/lib/time';
import type { Database } from '@/types/database';
import { fetchTeamDirectory, type TeamMember } from './api';

type Attendance = Database['public']['Enums']['attendance_status'];
type Tab = 'overview' | 'kpi' | 'attendance' | 'tasks';

/** Colleague profile; KPI, attendance and tasks appear only for people allowed to see them. */
export function EmployeeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { can } = useAuth();
  const query = useQuery({ queryKey: ['team', 'directory'], queryFn: fetchTeamDirectory });
  const member = query.data?.find((m) => m.user_id === id);
  const self = id === me.userId;
  const tabs: { key: Tab; label: string; show: boolean }[] = [
    { key: 'overview', label: 'Umumiy', show: true },
    { key: 'kpi', label: 'KPI', show: self || can('performance.read') },
    { key: 'attendance', label: 'Davomat', show: self || can('attendance.read') },
    { key: 'tasks', label: 'Vazifalar', show: self || can('tasks.read_all') },
  ];
  const [tab, setTab] = useState<Tab>('overview');

  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: member?.full_name ?? 'Xodim' }} />
      <QueryView query={query}>
        {() =>
          !member ? (
            <EmptyState icon="user-x" title="Xodim topilmadi" description="Akkaunt o‘chirilgan yoki sizga ko‘rinmaydi." />
          ) : (
            <>
              <Header member={member} />
              {tabs.filter((t) => t.show).length > 1 ? (
                <ChipRow>
                  {tabs
                    .filter((t) => t.show)
                    .map((t) => (
                      <Chip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />
                    ))}
                </ChipRow>
              ) : null}
              {tab === 'overview' ? <Overview member={member} /> : null}
              {tab === 'kpi' ? <Kpi userId={member.user_id} /> : null}
              {tab === 'attendance' ? <AttendanceMonth userId={member.user_id} /> : null}
              {tab === 'tasks' ? <Tasks userId={member.user_id} /> : null}
            </>
          )
        }
      </QueryView>
    </Screen>
  );
}

function Header({ member }: { member: TeamMember }) {
  return (
    <View style={styles.header}>
      <Avatar name={member.full_name} url={member.avatar_url} size={84} />
      <Text variant="title" align="center">
        {member.full_name}
      </Text>
      <Text variant="body" tone="secondary" align="center">
        {member.job_title ?? '—'}
      </Text>
      <View style={styles.badges}>
        {member.roles.map((r) => (
          <Badge key={r.key} label={r.name} tone="accent" />
        ))}
        {member.attendance_status ? (
          <Badge
            label={`Bugun: ${ATTENDANCE_STATUS[member.attendance_status as Attendance].label}${member.late_minutes ? ` (${member.late_minutes} daq)` : ''}`}
            tone={ATTENDANCE_STATUS[member.attendance_status as Attendance].tone}
          />
        ) : null}
      </View>
    </View>
  );
}

function Overview({ member }: { member: TeamMember }) {
  const me = useMe();
  const nav = useNav();
  const toast = useToast();
  const message = useMutation({ mutationFn: () => openDirectChat(member.user_id), onSuccess: (roomId) => nav.chat(roomId), onError: toast.error });
  return (
    <>
      <View style={styles.actions}>
        {me.kind === 'staff' && member.user_id !== me.userId ? (
          <Button title="Xabar" icon="message-circle" size="md" fullWidth={false} style={styles.flex} loading={message.isPending} onPress={() => message.mutate()} />
        ) : null}
        {member.phone ? <Button title="Qo‘ng‘iroq" icon="phone" variant="secondary" size="md" fullWidth={false} style={styles.flex} onPress={() => Linking.openURL(`tel:${member.phone}`)} /> : null}
        {member.email ? <Button title="Email" icon="mail" variant="secondary" size="md" fullWidth={false} style={styles.flex} onPress={() => Linking.openURL(`mailto:${member.email}`)} /> : null}
      </View>
      {member.open_tasks != null ? (
        <Section title="Bugungi yuklama">
          <Card>
            <Counters
              items={[
                { label: 'Ochiq vazifa', value: member.open_tasks ?? 0 },
                { label: 'Bugun muddat', value: member.due_today ?? 0 },
                { label: 'Overdue', value: member.overdue_tasks ?? 0, tone: member.overdue_tasks ? 'danger' : 'primary' },
                { label: 'Syomka', value: member.shootings_today ?? 0 },
              ]}
            />
          </Card>
        </Section>
      ) : null}
      <Section title="Aloqa">
        <Card style={styles.contact}>
          <Line label="Telefon" value={member.phone ?? '—'} />
          <Line label="Email" value={member.email ?? '—'} />
          <Line label="Bo‘lim" value={member.department ?? '—'} />
        </Card>
      </Section>
    </>
  );
}

function Kpi({ userId }: { userId: string }) {
  const [month, setMonth] = useState(monthStartKey(agencyDateKey()));
  const range = monthRange(month);
  const query = useQuery({ queryKey: ['team', 'scorecards', userId, range.from, range.to], queryFn: () => fetchScorecards(range.from, range.to, userId) });
  return (
    <>
      <MonthSwitcher month={month} onChange={setMonth} />
      <QueryView query={query}>{(cards) => (cards[0] ? <ScorecardView card={cards[0]} /> : <EmptyState icon="bar-chart-2" title="Bu oy uchun ma’lumot yo‘q" />)}</QueryView>
    </>
  );
}

function AttendanceMonth({ userId }: { userId: string }) {
  const [month, setMonth] = useState(monthStartKey(agencyDateKey()));
  const range = monthRange(month);
  const query = useQuery({ queryKey: ['attendance', 'month', userId, range.from, range.to], queryFn: () => fetchAttendanceMonth(userId, range.from, range.to) });
  return (
    <>
      <MonthSwitcher month={month} onChange={setMonth} />
      <QueryView query={query}>
        {({ rows, summary }) => (
          <>
            <Card>
              <Counters
                items={[
                  { label: 'Ish kuni', value: Number(summary.scheduled_days ?? 0) },
                  { label: 'Keldi', value: Number(summary.present ?? 0) + Number(summary.late ?? 0), tone: 'success' },
                  { label: 'Kechikdi', value: Number(summary.late ?? 0), tone: summary.late ? 'warning' : 'primary' },
                  { label: 'Kelmadi', value: Number(summary.absent ?? 0), tone: summary.absent ? 'danger' : 'primary' },
                ]}
              />
            </Card>
            {rows.length === 0 ? (
              <EmptyState icon="calendar" title="Bu oy hali belgilanmagan" />
            ) : (
              <Card padded={false}>
                {rows.map((r, i) => {
                  const meta = ATTENDANCE_STATUS[r.status];
                  return (
                    <ItemRow
                      key={r.id}
                      first={i === 0}
                      icon={meta.icon}
                      title={formatDateKey(r.work_date)}
                      subtitle={[r.arrived_at ? `keldi ${r.arrived_at.slice(0, 5)}` : null, r.late_minutes ? `${r.late_minutes} daq kechikdi` : null, r.note].filter(Boolean).join(' · ') || null}
                      right={<Badge label={meta.label} tone={meta.tone} />}
                    />
                  );
                })}
              </Card>
            )}
          </>
        )}
      </QueryView>
    </>
  );
}

function Tasks({ userId }: { userId: string }) {
  const nav = useNav();
  const query = useInfiniteQuery({
    queryKey: ['tasks', 'list', { scope: 'mine', userId, statuses: OPEN_STATUSES }],
    queryFn: ({ pageParam }) => fetchTasks({ scope: 'mine', userId, statuses: OPEN_STATUSES, sort: 'deadline' }, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === TASK_PAGE ? all.length : undefined),
  });
  const items = query.data?.pages.flat() ?? [];
  return (
    <QueryView query={{ ...query, data: query.data ? items : undefined }} isEmpty={(d) => d.length === 0} empty={{ icon: 'check-circle', title: 'Ochiq vazifa yo‘q' }}>
      {(list) => (
        <>
          {list.map((t) => (
            <TaskCard key={t.id} task={toSummary(t)} onPress={() => nav.task(t.id)} />
          ))}
        </>
      )}
    </QueryView>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      <Text variant="bodyMedium" selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  contact: { gap: spacing.md },
  line: { gap: 2 },
});
