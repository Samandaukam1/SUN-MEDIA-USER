import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Badge, Card, ItemRow, QueryView, Screen, SegmentedControl, Text } from '@/components/ui';
import { ROLE_LABEL } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useNav } from '@/lib/routes';
import { addDaysToKey, addMonthsToKey, agencyDateKey, monthStartKey } from '@/lib/time';
import { attendanceRate, fetchScorecards, type Scorecard } from './api';
import { MonthSwitcher } from './MonthSwitcher';

type Sort = 'tasks' | 'ontime' | 'attendance';

export function monthRange(month: string) {
  const end = addDaysToKey(addMonthsToKey(month, 1), -1);
  const today = agencyDateKey();
  return { from: month, to: end < today ? end : today };
}

/** Team KPI for a month (performance.read): who delivered, on time, and who was present. */
export function PerformanceScreen() {
  const nav = useNav();
  const [month, setMonth] = useState(monthStartKey(agencyDateKey()));
  const [sort, setSort] = useState<Sort>('tasks');
  const range = monthRange(month);
  const query = useQuery({ queryKey: ['team', 'scorecards', range.from, range.to], queryFn: () => fetchScorecards(range.from, range.to) });

  const score = (c: Scorecard) =>
    sort === 'tasks' ? c.metrics.completed_tasks : sort === 'ontime' ? c.metrics.on_time_rate ?? -1 : attendanceRate(c.metrics) ?? -1;

  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: 'Jamoa KPI' }} />
      <MonthSwitcher month={month} onChange={setMonth} />
      <SegmentedControl
        options={[
          { value: 'tasks', label: 'Bajarilgan' },
          { value: 'ontime', label: 'O‘z vaqtida' },
          { value: 'attendance', label: 'Davomat' },
        ]}
        value={sort}
        onChange={setSort}
      />
      <QueryView query={query} isEmpty={(d) => d.length === 0} empty={{ icon: 'bar-chart-2', title: 'Bu oy uchun ma’lumot yo‘q' }}>
        {(cards) => (
          <Card padded={false}>
            {[...cards]
              .sort((a, b) => score(b) - score(a))
              .map((c, i) => {
                const att = attendanceRate(c.metrics);
                return (
                  <ItemRow
                    key={c.user_id}
                    first={i === 0}
                    leading={
                      <View style={styles.rank}>
                        <Text variant="captionMedium" tone="tertiary" style={styles.rankNum}>
                          {i + 1}
                        </Text>
                        <Avatar name={c.full_name} size={34} />
                      </View>
                    }
                    title={c.full_name}
                    subtitle={`${c.role_keys.map((r) => ROLE_LABEL[r] ?? r).join(', ')} · ${c.metrics.completed_tasks}/${c.metrics.assigned_tasks} vazifa${c.metrics.overdue_tasks ? ` · ${c.metrics.overdue_tasks} overdue` : ''}`}
                    right={
                      <View style={styles.badges}>
                        <Badge label={c.metrics.on_time_rate == null ? 'vaqtida —' : `${c.metrics.on_time_rate}% vaqtida`} tone={c.metrics.on_time_rate == null ? 'neutral' : c.metrics.on_time_rate >= 85 ? 'success' : 'warning'} />
                        <Badge label={att == null ? 'davomat —' : `davomat ${att}%`} />
                      </View>
                    }
                    onPress={() => nav.employee(c.user_id)}
                  />
                );
              })}
          </Card>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rank: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rankNum: { width: 18, textAlign: 'right', fontVariant: ['tabular-nums'] },
  badges: { alignItems: 'flex-end', gap: 4 },
});
