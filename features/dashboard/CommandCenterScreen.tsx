import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, EmptyState, ErrorState, Screen, Section, SkeletonCards, Text } from '@/components/ui';
import { ATTENDANCE_STATUS, CONTENT_STATUS, PLATFORM_LABEL, SHOOTING_ATTENDANCE_STATUS, SHOOTING_STATUS } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { agencyDateKey, formatDateKeyLong, formatShortDateTime, formatTime } from '@/lib/time';
import type { Database } from '@/types/database';
import { fetchCommandCenter, type CommandCenter } from './api';
import { MetricTile } from './components/MetricTile';

type Enums = Database['public']['Enums'];

export function CommandCenterScreen() {
  const today = agencyDateKey();
  const query = useQuery({
    queryKey: ['dashboard', 'command-center', today],
    queryFn: () => fetchCommandCenter(today),
    // Overdue counts change with the clock even when no row changes.
    refetchInterval: 60_000,
  });

  return (
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <View style={styles.header}>
        <Text variant="caption" tone="tertiary">
          {formatDateKeyLong(today)}
        </Text>
        <Text variant="display">Bugun agentlikda</Text>
      </View>
      {query.isPending ? (
        <SkeletonCards count={4} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <CommandCenterBody data={query.data} />
      )}
    </Screen>
  );
}

function CommandCenterBody({ data }: { data: CommandCenter }) {
  const { tasks, attendance, approvals, publications } = data;
  const arrived = attendance.present + attendance.late + attendance.remote;
  return (
    <>
      <View style={styles.grid}>
        <MetricTile icon="check-square" label="Vazifalar" value={String(tasks.total)} detail={`${tasks.completed} bajarildi · ${tasks.in_progress} jarayonda`} />
        <MetricTile icon="alert-octagon" label="Overdue" value={String(tasks.overdue)} tone={tasks.overdue > 0 ? 'danger' : 'primary'} detail="muddati o‘tgan vazifa" />
        <MetricTile
          icon="users"
          label="Davomat"
          value={`${arrived}/${attendance.employees}`}
          detail={`${attendance.late} kechikdi · ${attendance.absent} kelmadi${attendance.unmarked ? ` · ${attendance.unmarked} belgilanmagan` : ''}`}
        />
        <MetricTile icon="eye" label="Mijoz tasdig‘i" value={String(approvals.client_review)} tone={approvals.client_review > 0 ? 'warning' : 'primary'} detail={`${approvals.internal_review} ichki tekshiruvda`} />
        <MetricTile icon="video" label="Syomkalar" value={String(data.shootings.length)} detail="bugun rejada" />
        <MetricTile icon="send" label="Nashrlar" value={String(publications.scheduled)} detail={`${publications.published} joylandi`} />
      </View>

      <Section title="Bugungi syomkalar">
        {data.shootings.length === 0 ? (
          <EmptyState icon="video-off" title="Bugun syomka yo‘q" />
        ) : (
          data.shootings.map((s) => {
            const status = SHOOTING_STATUS[s.status as Enums['shooting_status']];
            return (
              <Card key={s.id}>
                <View style={styles.rowBetween}>
                  <Text variant="heading">
                    {formatTime(s.starts_at)} — {s.client_name}
                  </Text>
                  {status ? <Badge label={status.label} tone={status.tone} /> : null}
                </View>
                <Text variant="caption" tone="secondary" style={styles.mt4}>
                  {[s.title, s.location_name].filter(Boolean).join(' · ')}
                </Text>
                <View style={styles.chips}>
                  {s.members.map((m) => {
                    const a = SHOOTING_ATTENDANCE_STATUS[(m.attendance ?? 'pending') as Enums['shooting_attendance_status']];
                    return <Badge key={m.user_id} label={`${m.full_name} · ${a.label}`} tone={a.tone} />;
                  })}
                </View>
              </Card>
            );
          })
        )}
      </Section>

      <Section title={`Mijoz tasdig‘ini kutmoqda · ${approvals.client_review}`}>
        {approvals.items.length === 0 ? (
          <EmptyState icon="check-circle" title="Kutilayotgan tasdiq yo‘q" />
        ) : (
          approvals.items.map((item) => {
            const status = CONTENT_STATUS[item.status as Enums['content_status']];
            return (
              <Card key={item.content_id}>
                <Text variant="bodyMedium" numberOfLines={2}>
                  {item.label}
                </Text>
                <View style={[styles.rowBetween, styles.mt8]}>
                  <Badge label={status?.label ?? item.status} tone={status?.tone ?? 'neutral'} dot />
                  <Text variant="caption" tone="tertiary">
                    {formatShortDateTime(item.since)} dan beri
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </Section>

      {data.overdue.length > 0 ? (
        <Section title={`Overdue · ${data.overdue.length}`}>
          {data.overdue.map((t) => (
            <Card key={t.task_id}>
              <Text variant="bodyMedium">{t.title}</Text>
              <Text variant="caption" tone="danger" style={styles.mt4}>
                Deadline: {formatShortDateTime(t.due_at)}
              </Text>
              <Text variant="caption" tone="secondary" style={styles.mt4}>
                {[t.client_name, t.assignees.join(', ') || 'Biriktirilmagan'].filter(Boolean).join(' · ')}
              </Text>
            </Card>
          ))}
        </Section>
      ) : null}

      <Section title={`Bugungi nashrlar · ${publications.scheduled}`}>
        {publications.items.length === 0 ? (
          <EmptyState icon="send" title="Bugun nashr rejalashtirilmagan" />
        ) : (
          publications.items.map((p) => (
            <Card key={p.publication_id}>
              <View style={styles.rowBetween}>
                <Text variant="heading">{formatTime(p.scheduled_at)}</Text>
                <Badge label={p.status === 'published' ? 'Joylandi' : 'Kutilmoqda'} tone={p.status === 'published' ? 'success' : 'info'} />
              </View>
              <Text variant="caption" tone="secondary" style={styles.mt4}>
                {PLATFORM_LABEL[p.platform as Enums['social_platform']] ?? p.platform} · {p.label}
              </Text>
            </Card>
          ))
        )}
      </Section>

      <Section title={`Davomat · ${attendance.employees} xodim`}>
        <Card>
          {attendance.people.map((person, i) => {
            const a = person.status ? ATTENDANCE_STATUS[person.status as Enums['attendance_status']] : null;
            return (
              <View key={person.user_id} style={[styles.rowBetween, i > 0 && styles.mt12]}>
                <View style={styles.flex}>
                  <Text variant="bodyMedium">{person.full_name}</Text>
                  {person.job_title ? (
                    <Text variant="caption" tone="tertiary">
                      {person.job_title}
                    </Text>
                  ) : null}
                </View>
                <Badge label={a ? `${a.label}${person.late_minutes ? ` · ${person.late_minutes} daq` : ''}` : 'Belgilanmagan'} tone={a?.tone ?? 'neutral'} />
              </View>
            );
          })}
        </Card>
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  flex: { flex: 1 },
  mt4: { marginTop: 4 },
  mt8: { marginTop: spacing.sm },
  mt12: { marginTop: spacing.md },
});
