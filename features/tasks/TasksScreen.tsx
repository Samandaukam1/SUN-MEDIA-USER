import { useInfiniteQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Chip, ChipRow, EmptyState, ErrorState, Fab, SearchField, SegmentedControl, SkeletonCards, PullRefreshControl } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { fetchTasks, OPEN_STATUSES, TASK_PAGE, type TaskFilters, type TaskListItem, type TaskStatus } from './api';
import { TaskCard, type TaskSummary } from './components/TaskCard';

const TABS: { key: string; label: string; statuses?: TaskStatus[]; overdue?: boolean }[] = [
  { key: 'open', label: 'Faol', statuses: OPEN_STATUSES },
  { key: 'overdue', label: 'Overdue', overdue: true },
  { key: 'todo', label: 'Navbatda', statuses: ['todo'] },
  { key: 'progress', label: 'Jarayonda', statuses: ['in_progress'] },
  { key: 'review', label: 'Tekshiruvda', statuses: ['in_review'] },
  { key: 'revision', label: 'Revision', statuses: ['revision'] },
  { key: 'done', label: 'Bajarildi', statuses: ['done'] },
  { key: 'cancelled', label: 'Bekor', statuses: ['cancelled'] },
];

export function toSummary(t: TaskListItem): TaskSummary {
  const done = t.checklist.filter((c) => c.is_done).length;
  return {
    id: t.id,
    title: t.title,
    task_type: t.task_type,
    status: t.status,
    priority: t.priority,
    due_at: t.due_at,
    client_name: t.client?.name,
    content_title: t.checklist.length ? `${t.content?.title ? `${t.content.title} · ` : ''}checklist ${done}/${t.checklist.length}` : t.content?.title,
    assignees: t.assignees.map((a) => a.person).filter((p): p is NonNullable<typeof p> => !!p).map((p) => ({ user_id: p.id, full_name: p.full_name, avatar_url: p.avatar_url })),
  };
}

export function TasksScreen() {
  const me = useMe();
  const { can } = useAuth();
  const nav = useNav();
  const { colors } = useTheme();
  const canSeeAll = can('tasks.read_all') || can('tasks.manage');
  const [scope, setScope] = useState<'mine' | 'all'>(canSeeAll && me.kind === 'staff' && can('dashboard.view') ? 'all' : 'mine');
  const [tab, setTab] = useState('open');
  const [search, setSearch] = useState('');
  const current = TABS.find((t) => t.key === tab)!;
  const filters = useMemo<TaskFilters>(
    () => ({ scope, userId: me.userId, statuses: current.statuses, overdue: current.overdue, search, sort: tab === 'done' ? 'newest' : 'deadline' }),
    [scope, me.userId, current, search, tab],
  );
  const query = useInfiniteQuery({
    queryKey: ['tasks', 'list', filters],
    queryFn: ({ pageParam }) => fetchTasks(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === TASK_PAGE ? all.length : undefined),
  });
  const items = query.data?.pages.flat() ?? [];

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Vazifalar' }} />
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.4}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        refreshControl={<PullRefreshControl busy={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} />}
        ListHeaderComponent={
          <View style={styles.header}>
            {canSeeAll ? (
              <SegmentedControl
                options={[
                  { value: 'mine', label: 'Mening' },
                  { value: 'all', label: 'Barcha vazifalar' },
                ]}
                value={scope}
                onChange={setScope}
              />
            ) : null}
            <SearchField value={search} onChangeText={setSearch} placeholder="Vazifa nomi" />
            <ChipRow>
              {TABS.map((t) => (
                <Chip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} icon={t.overdue ? 'alert-triangle' : undefined} />
              ))}
            </ChipRow>
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <SkeletonCards count={4} />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : (
            <EmptyState
              icon={tab === 'overdue' ? 'check-circle' : 'check-square'}
              title={tab === 'overdue' ? 'Muddati o‘tgan vazifa yo‘q' : 'Vazifa topilmadi'}
              description={tab === 'open' && scope === 'mine' ? 'Yangi vazifa biriktirilganda shu yerda ko‘rinadi.' : undefined}
            />
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.more} color={colors.textTertiary} /> : null}
        renderItem={({ item }) => <TaskCard task={toSummary(item)} onPress={() => nav.task(item.id)} />}
      />
      {can('tasks.manage') ? <Fab label="Yangi vazifa" onPress={() => nav.go('/task/new')} overHomeIndicator /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: 120 },
  header: { gap: spacing.md, marginBottom: spacing.xs },
  more: { marginVertical: spacing.lg },
});
