import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Chip, ChipRow, EmptyState, Fab, IconButton, QueryView, Screen, ScreenHeader, SegmentedControl, Section, Skeleton, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useStrings } from '@/lib/i18n';
import { useNav } from '@/lib/routes';
import {
  addDaysToKey,
  addMonthsToKey,
  agencyDateKey,
  agencyDayRange,
  formatDateKey,
  formatDateKeyLong,
  formatMonthYear,
  monthGrid,
  monthStartKey,
  weekStartKey,
} from '@/lib/time';
import { eventGroup, fetchCalendar, type CalendarRow, type EventGroup } from './api';
import { EventRow } from './components/EventRow';
import { MonthGrid } from './components/MonthGrid';
import { WeekStrip } from './components/WeekStrip';

type View_ = 'day' | 'week' | 'month';

const GROUPS: { key: EventGroup; label: string; staffOnly?: boolean }[] = [
  { key: 'all', label: 'Barchasi' },
  { key: 'shooting', label: 'Syomka' },
  { key: 'publication', label: 'Nashr' },
  { key: 'deadline', label: 'Muddatlar' },
  { key: 'approval', label: 'Tasdiqlash' },
  { key: 'company', label: 'Kompaniya', staffOnly: true },
];

export function CalendarScreen() {
  const me = useMe();
  const { can } = useAuth();
  const s = useStrings();
  const nav = useNav();
  const isStaff = me.kind === 'staff';
  const today = agencyDateKey();
  const [view, setView] = useState<View_>('day');
  const [selected, setSelected] = useState(today);
  const [group, setGroup] = useState<EventGroup>('all');

  const range = useMemo(() => {
    if (view === 'month') {
      const grid = monthGrid(monthStartKey(selected));
      return { from: agencyDayRange(grid[0]).from, to: agencyDayRange(grid[41]).to };
    }
    const start = weekStartKey(selected);
    return { from: agencyDayRange(start).from, to: agencyDayRange(addDaysToKey(start, 6)).to };
  }, [view, selected]);

  const query = useQuery({ queryKey: ['calendar', range.from, range.to], queryFn: () => fetchCalendar(range.from, range.to) });
  const events = useMemo(() => (query.data ?? []).filter((e) => group === 'all' || eventGroup(e.event_type) === group), [query.data, group]);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarRow[]>();
    events.forEach((e) => {
      const key = agencyDateKey(e.starts_at);
      map.set(key, [...(map.get(key) ?? []), e]);
    });
    return map;
  }, [events]);
  const dayInfo = useMemo(() => {
    const map = new Map<string, { total: number; groups: Set<EventGroup> }>();
    byDay.forEach((list, key) => map.set(key, { total: list.length, groups: new Set(list.map((e) => eventGroup(e.event_type))) }));
    return map;
  }, [byDay]);
  const counts = useMemo(() => new Map([...byDay.entries()].map(([k, v]) => [k, v.length])), [byDay]);

  const shift = (dir: 1 | -1) => {
    if (view === 'month') setSelected(addMonthsToKey(selected, dir));
    else setSelected(addDaysToKey(selected, view === 'week' ? 7 * dir : dir));
  };
  const title =
    view === 'month' ? formatMonthYear(selected) : view === 'week' ? `${formatDateKey(weekStartKey(selected))} — ${formatDateKey(addDaysToKey(weekStartKey(selected), 6), true)}` : formatDateKeyLong(selected);

  const open = (e: CalendarRow) => {
    if (e.event_type === 'shooting') return () => nav.shooting(e.entity_id);
    if (e.event_type.startsWith('company_')) return () => nav.go('/events');
    if (e.content_id) return () => nav.content(e.content_id!);
    return undefined;
  };

  return (
    <View style={styles.fill}>
    <Screen refreshing={query.isRefetching} onRefresh={() => query.refetch()} contentStyle={can('shootings.manage') ? { paddingBottom: 110 } : undefined}>
      <ScreenHeader
        title={s.nav.calendar}
        subtitle={isStaff ? 'Syomkalar, muddatlar, tasdiqlash va nashrlar' : 'Sizning kontent rejangiz'}
        right={selected !== today ? <Button title="Bugun" size="md" variant="secondary" fullWidth={false} onPress={() => setSelected(today)} /> : undefined}
      />
      <SegmentedControl<View_>
        options={[
          { value: 'day', label: 'Kun' },
          { value: 'week', label: 'Hafta' },
          { value: 'month', label: 'Oy' },
        ]}
        value={view}
        onChange={setView}
      />
      <View style={styles.nav}>
        <IconButton icon="chevron-left" label="Oldingi" onPress={() => shift(-1)} size={38} />
        <Text variant="heading" align="center" style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <IconButton icon="chevron-right" label="Keyingi" onPress={() => shift(1)} size={38} />
      </View>

      {view === 'month' ? (
        <Card>
          <MonthGrid month={monthStartKey(selected)} selected={selected} days={dayInfo} onSelect={setSelected} />
        </Card>
      ) : (
        <WeekStrip weekStart={weekStartKey(selected)} selected={selected} counts={counts} onSelect={setSelected} />
      )}

      <ChipRow>
        {GROUPS.filter((g) => isStaff || !g.staffOnly).map((g) => (
          <Chip key={g.key} label={g.label} selected={group === g.key} onPress={() => setGroup(g.key)} />
        ))}
      </ChipRow>

      <QueryView query={query} skeleton={<Skeleton height={220} rounded={16} />}>
        {() =>
          view === 'week' ? (
            <WeekAgenda weekStart={weekStartKey(selected)} byDay={byDay} open={open} showClient={isStaff} />
          ) : (
            <DayList day={selected} events={byDay.get(selected) ?? []} open={open} showClient={isStaff} />
          )
        }
      </QueryView>
    </Screen>
    {can('shootings.manage') ? <Fab icon="video" label="Yangi syomka" onPress={() => nav.go('/shooting/new')} /> : null}
    </View>
  );
}

function DayList({ day, events, open, showClient }: { day: string; events: CalendarRow[]; open: (e: CalendarRow) => (() => void) | undefined; showClient: boolean }) {
  if (events.length === 0) {
    return <EmptyState icon="calendar" title="Bu kunda hodisa yo‘q" description={`${formatDateKeyLong(day)} uchun syomka, muddat yoki nashr rejalashtirilmagan.`} />;
  }
  return (
    <Section title={`${formatDateKeyLong(day)} · ${events.length}`}>
      <Card style={styles.list}>
        {events.map((e) => (
          <EventRow key={`${e.event_type}:${e.entity_id}`} event={e} onPress={open(e)} showClient={showClient} />
        ))}
      </Card>
    </Section>
  );
}

function WeekAgenda({ weekStart, byDay, open, showClient }: { weekStart: string; byDay: Map<string, CalendarRow[]>; open: (e: CalendarRow) => (() => void) | undefined; showClient: boolean }) {
  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStart, i)).filter((d) => (byDay.get(d)?.length ?? 0) > 0);
  if (days.length === 0) return <EmptyState icon="calendar" title="Bu haftada hodisa yo‘q" />;
  return (
    <>
      {days.map((d) => (
        <Section key={d} title={`${formatDateKeyLong(d)} · ${byDay.get(d)!.length}`}>
          <Card style={styles.list}>
            {byDay.get(d)!.map((e) => (
              <EventRow key={`${e.event_type}:${e.entity_id}`} event={e} onPress={open(e)} showClient={showClient} />
            ))}
          </Card>
        </Section>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1 },
  list: { paddingVertical: spacing.xs },
});
