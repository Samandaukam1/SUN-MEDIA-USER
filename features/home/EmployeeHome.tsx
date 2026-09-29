import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, IconButton, ItemRow, ListGroup, ListRow, QueryView, Screen, ScreenHeader, Section, Text, Timeline, type TimelineItem } from '@/components/ui';
import { QuickCreateFab } from '@/components/navigation/QuickCreateFab';
import { CONTENT_STATUS, CONTENT_TYPE, TASK_TYPE } from '@/constants/labels';
import { useMe } from '@/features/auth/AuthProvider';
import { ShootingCard } from '@/features/shootings/components/ShootingCard';
import { TaskCard } from '@/features/tasks/components/TaskCard';
import { WorkspaceHomeSection } from '@/features/workspace/components/WorkspaceHomeSection';
import { useNav } from '@/lib/routes';
import { agencyDateKey, formatDateKeyLong, formatShortDateTime, formatTime, greetingForNow } from '@/lib/time';
import type { Database } from '@/types/database';
import { fetchEmployeeHome, type EmployeeHome as EmployeeHomeData } from './api';
import { useAgencyDate } from './useAgencyDate';

type Enums = Database['public']['Enums'];
const DONE = ['approved', 'scheduled', 'published', 'cancelled'];

/**
 * Employee Home: my day in order of time. A new operator finds today's shooting (time, place, script) at the top;
 * an editor finds what must be delivered today and what the client sent back.
 */
export function EmployeeHome() {
  const me = useMe();
  const nav = useNav();
  const today = useAgencyDate();
  const query = useQuery({ queryKey: ['home', 'employee', me.userId, today], queryFn: fetchEmployeeHome, refetchInterval: 60_000 });
  const firstName = me.profile?.full_name.split(' ')[0] ?? '';

  return (
    <View style={styles.fill}>
      <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()} contentStyle={styles.fabSpace}>
        <ScreenHeader
          eyebrow={formatDateKeyLong(today)}
          title={`${greetingForNow()}, ${firstName}`}
          subtitle={me.employee?.job_title ?? me.roles[0]?.name}
          right={<IconButton icon="search" label="Qidiruv" onPress={() => nav.go('/search')} />}
        />
        <QueryView query={query}>{(data) => <Agenda data={data} userId={me.userId} />}</QueryView>
      </Screen>
      <QuickCreateFab />
    </View>
  );
}

function Agenda({ data, userId }: { data: EmployeeHomeData; userId: string }) {
  const nav = useNav();
  const today = data.date;
  const isToday = (at: string | null | undefined) => !!at && agencyDateKey(at) === today;
  const shootingsToday = data.shootings.filter((s) => isToday(s.starts_at));
  const shootingsLater = data.shootings.filter((s) => !isToday(s.starts_at));
  const reworks = data.content.filter((c) => c.status === 'revision');
  const openTasks = data.tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');

  // Deadlines of the day (tasks and my content), in time order.
  const agenda: (TimelineItem & { at: string })[] = [
    ...openTasks
      .filter((t) => isToday(t.due_at))
      .map((t) => ({
        id: `task:${t.id}`,
        at: t.due_at!,
        time: formatTime(t.due_at),
        kicker: TASK_TYPE[t.task_type as Enums['task_type']]?.label ?? 'Vazifa',
        title: t.title,
        detail: t.client_name,
        icon: TASK_TYPE[t.task_type as Enums['task_type']]?.icon ?? ('check-square' as const),
        onPress: () => nav.task(t.id),
      })),
    ...data.content
      .filter((c) => isToday(c.due_at) && !DONE.includes(c.status))
      .map((c) => ({
        id: `content:${c.id}`,
        at: c.due_at!,
        time: formatTime(c.due_at),
        kicker: `${CONTENT_TYPE[c.content_type as Enums['content_type']]?.label ?? 'Kontent'} topshirish`,
        title: c.title,
        detail: c.client_name,
        icon: CONTENT_TYPE[c.content_type as Enums['content_type']]?.icon ?? ('film' as const),
        onPress: () => nav.content(c.id),
      })),
  ].sort((a, b) => a.at.localeCompare(b.at));
  const nextIndex = agenda.findIndex((i) => new Date(i.at).getTime() >= Date.now());
  const agendaIds = new Set(agenda.map((a) => a.id));
  const moreContent = data.content.filter((c) => c.status !== 'revision' && !agendaIds.has(`content:${c.id}`)).slice(0, 5);

  return (
    <>
      {data.task_stats.overdue > 0 ? (
        <ListGroup>
          <ListRow icon="alert-triangle" iconTone="danger" title={`${data.task_stats.overdue} ta vazifa muddati o‘tgan`} subtitle="Ochib, holatini yangilang" onPress={() => nav.go('/tasks')} />
        </ListGroup>
      ) : null}

      <Section title="Bugun">
        {shootingsToday.map((s) => (
          <ShootingCard
            key={s.id}
            shooting={{ ...s, members: s.crew.map((c) => ({ ...c, attendance: c.user_id === userId ? s.my_attendance : null })) }}
            onPress={() => nav.shooting(s.id)}
          />
        ))}
        {agenda.length > 0 ? (
          <Card>
            <Timeline items={agenda.map((a, i) => ({ ...a, highlight: i === nextIndex }))} />
          </Card>
        ) : null}
        {shootingsToday.length === 0 && agenda.length === 0 ? (
          <Card variant="sunken">
            <Text variant="body" tone="secondary">
              Bugun sizga belgilangan syomka yoki muddat yo‘q.
            </Text>
          </Card>
        ) : null}
      </Section>

      {reworks.length > 0 ? (
        <Section title="O‘zgartirish so‘ralgan">
          <Card padded={false}>
            {reworks.map((c, i) => (
              <ItemRow
                key={c.id}
                first={i === 0}
                icon="rotate-ccw"
                title={c.title}
                subtitle={[c.client_name, c.due_at ? formatShortDateTime(c.due_at) : null].filter(Boolean).join(' · ')}
                right={<Badge label="Tuzatish kerak" tone="danger" />}
                onPress={() => nav.content(c.id)}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      <Section title="Vazifalarim" actionLabel={openTasks.length ? 'Barchasi' : undefined} onAction={openTasks.length ? () => nav.go('/tasks') : undefined}>
        {openTasks.length === 0 ? (
          <Text variant="caption" tone="tertiary">
            Hozircha ochiq vazifangiz yo‘q. Yangi vazifa berilsa, bildirishnoma keladi.
          </Text>
        ) : (
          openTasks.slice(0, 5).map((t) => <TaskCard key={t.id} task={t} onPress={() => nav.task(t.id)} />)
        )}
      </Section>

      {moreContent.length > 0 ? (
        <Section title="Ishimdagi kontent" actionLabel="Studiya" onAction={() => nav.tab('studio')}>
          <Card padded={false}>
            {moreContent.map((c, i) => {
              const status = CONTENT_STATUS[c.status as Enums['content_status']];
              return (
                <ItemRow
                  key={c.id}
                  first={i === 0}
                  icon={CONTENT_TYPE[c.content_type as Enums['content_type']]?.icon ?? 'film'}
                  title={c.title}
                  subtitle={[c.client_name, c.due_at ? formatShortDateTime(c.due_at) : null].filter(Boolean).join(' · ')}
                  right={<Badge label={status.label} tone={status.tone} />}
                  onPress={() => nav.content(c.id)}
                />
              );
            })}
          </Card>
        </Section>
      ) : null}

      <WorkspaceHomeSection userId={userId} />

      {shootingsLater.length > 0 ? (
        <Section title="Keyingi syomkalar">
          {shootingsLater.map((s) => (
            <ShootingCard key={s.id} shooting={{ ...s, members: s.crew }} onPress={() => nav.shooting(s.id)} />
          ))}
        </Section>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  fabSpace: { paddingBottom: 120 },
});
