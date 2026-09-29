import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, ChipRow, EmptyState, ErrorState, Fab, ScreenHeader, SegmentedControl, SkeletonCards, PullRefreshControl } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchShootingList } from '@/features/shootings/api';
import { ShootingCard } from '@/features/shootings/components/ShootingCard';
import { ContentList } from '@/features/studio/StudioScreen';
import { TaskList } from '@/features/tasks/TasksScreen';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { agencyDateKey, agencyDayRange } from '@/lib/time';

type Part = 'tasks' | 'content' | 'shootings';

/**
 * ISHLAR tab (Admin / Rahbar): the day-to-day work in one place — tasks, content and shootings.
 * What a person may change is still decided by permissions (Rahbar only looks).
 */
export function WorkScreen() {
  const { colors } = useTheme();
  const [part, setPart] = useState<Part>('tasks');
  const header = (
    <View style={styles.top}>
      <ScreenHeader title="Ishlar" subtitle="Vazifalar, kontent va syomkalar" />
      <SegmentedControl<Part>
        options={[
          { value: 'tasks', label: 'Vazifalar' },
          { value: 'content', label: 'Kontent' },
          { value: 'shootings', label: 'Syomkalar' },
        ]}
        value={part}
        onChange={setPart}
      />
    </View>
  );
  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: colors.background }]}>
      {part === 'tasks' ? <TaskList top={header} inTab /> : null}
      {part === 'content' ? <ContentList top={() => header} /> : null}
      {part === 'shootings' ? <ShootingList header={header} /> : null}
    </SafeAreaView>
  );
}

function ShootingList({ header }: { header: React.ReactElement }) {
  const { can } = useAuth();
  const nav = useNav();
  const [when, setWhen] = useState<'upcoming' | 'past'>('upcoming');
  const from = agencyDayRange(agencyDateKey()).from;
  const query = useQuery({ queryKey: ['shootings', 'list', when, from], queryFn: () => fetchShootingList(when, from) });
  return (
    <View style={styles.fill}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshControl={<PullRefreshControl busy={query.isRefetching} onRefresh={() => query.refetch()} />}
        ListHeaderComponent={
          <View style={styles.header}>
            {header}
            <ChipRow>
              <Chip label="Kelgusi" selected={when === 'upcoming'} onPress={() => setWhen('upcoming')} />
              <Chip label="O‘tgan" selected={when === 'past'} onPress={() => setWhen('past')} />
            </ChipRow>
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <SkeletonCards count={3} />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : (
            <EmptyState icon="video-off" title={when === 'upcoming' ? 'Kelgusi syomka yo‘q' : 'O‘tgan syomka yo‘q'} description={can('shootings.manage') ? 'Yangi syomkani “+” tugmasi bilan rejalashtiring.' : undefined} />
          )
        }
        renderItem={({ item }) => <ShootingCard shooting={item} onPress={() => nav.shooting(item.id)} />}
      />
      {can('shootings.manage') ? <Fab label="Yangi syomka" onPress={() => nav.go('/shooting/new')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { gap: spacing.md },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120, gap: spacing.md },
  header: { gap: spacing.md, marginBottom: spacing.xs },
});
