import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';

import { EmptyState, QueryView, Screen } from '@/components/ui';
import { useMe } from '@/features/auth/AuthProvider';
import { agencyDateKey, monthStartKey } from '@/lib/time';
import { fetchScorecards } from './api';
import { MonthSwitcher } from './MonthSwitcher';
import { monthRange } from './PerformanceScreen';
import { ScorecardView } from './ScorecardView';

/** "Mening natijalarim": an employee's own KPI (the database allows only your own card). */
export function MyPerformanceScreen() {
  const me = useMe();
  const [month, setMonth] = useState(monthStartKey(agencyDateKey()));
  const range = monthRange(month);
  const query = useQuery({ queryKey: ['team', 'scorecards', 'me', range.from, range.to], queryFn: () => fetchScorecards(range.from, range.to, me.userId) });
  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: 'Mening natijalarim' }} />
      <MonthSwitcher month={month} onChange={setMonth} />
      <QueryView query={query}>
        {(cards) => (cards[0] ? <ScorecardView card={cards[0]} /> : <EmptyState icon="bar-chart-2" title="Bu oy uchun ma’lumot yo‘q" />)}
      </QueryView>
    </Screen>
  );
}
