import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, ChipRow, EmptyState, ErrorState, Fab, IconButton, ScreenHeader, SearchField, SkeletonCards, PullRefreshControl } from '@/components/ui';
import { CLIENT_STAGE_FILTERS } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useStrings } from '@/lib/i18n';
import { useNav } from '@/lib/routes';
import { fetchStudioPage, STUDIO_PAGE, type ContentStatus, type StudioFilters } from './api';
import { ContentCard } from './components/ContentCard';
import { countActiveFilters, StudioFilterSheet } from './components/StudioFilterSheet';

type Tab = { key: string; label: string; statuses: ContentStatus[] | null };

// Internal stages (the client approval step is history now: old items sit under "Ichki tekshiruv").
const STAFF_TABS: Tab[] = [
  { key: 'all', label: 'Barchasi', statuses: null },
  { key: 'idea', label: 'G‘oya', statuses: ['idea'] },
  { key: 'script', label: 'Ssenariy', statuses: ['script'] },
  { key: 'shooting', label: 'Syomka', statuses: ['ready_for_shoot', 'shooting', 'shot'] },
  { key: 'editing', label: 'Montaj', statuses: ['editing', 'revision'] },
  { key: 'internal', label: 'Ichki tekshiruv', statuses: ['internal_review', 'client_review'] },
  { key: 'approved', label: 'Tayyor', statuses: ['approved'] },
  { key: 'scheduled', label: 'Rejalashtirildi', statuses: ['scheduled'] },
  { key: 'published', label: 'Joylandi', statuses: ['published'] },
];

// Clients only follow six simple states.
const CLIENT_TABS: Tab[] = [{ key: 'all', label: 'Barchasi', statuses: null }, ...CLIENT_STAGE_FILTERS];

export function StudioScreen() {
  const me = useMe();
  const s = useStrings();
  const { colors } = useTheme();
  const isStaff = me.kind === 'staff';
  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <ContentList
        top={(filterButton) => (
          <ScreenHeader title={s.nav.studio} subtitle={isStaff ? 'Har bir kontent qayergacha yetgani' : 'Kontentingiz qayergacha yetgani'} right={filterButton} />
        )}
      />
    </SafeAreaView>
  );
}

/** Searchable, filterable content list; the Studio tab and the admin "Ishlar" tab both use it. */
export function ContentList({ top }: { top: (filterButton: ReactElement) => ReactElement }) {
  const me = useMe();
  const { can } = useAuth();
  const nav = useNav();
  const { colors } = useTheme();
  const isStaff = me.kind === 'staff';
  const tabs = isStaff ? STAFF_TABS : CLIENT_TABS;
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<StudioFilters>({ sort: 'newest' });
  const [filtering, setFiltering] = useState(false);

  const active = useMemo<StudioFilters>(
    () => ({ ...filters, search, statuses: tabs.find((t) => t.key === tab)?.statuses ?? undefined }),
    [filters, search, tab, tabs],
  );
  const query = useInfiniteQuery({
    queryKey: ['content', 'studio', active],
    queryFn: ({ pageParam }) => fetchStudioPage(active, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === STUDIO_PAGE ? all.length : undefined),
  });
  const items = query.data?.pages.flat() ?? [];
  const filterCount = countActiveFilters(filters);
  const filterButton = <IconButton icon="sliders" label={`Filtr${filterCount ? `, ${filterCount} faol` : ''}`} onPress={() => setFiltering(true)} badge={filterCount} />;

  return (
    <View style={styles.fill}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.4}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        refreshControl={<PullRefreshControl busy={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} />}
        ListHeaderComponent={
          <View style={styles.header}>
            {top(filterButton)}
            <SearchField value={search} onChangeText={setSearch} placeholder="Kontent nomi" />
            <ChipRow>
              {tabs.map((t) => (
                <Chip key={t.key} label={t.label} selected={tab === t.key} onPress={() => setTab(t.key)} />
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
              icon="film"
              title={search || filterCount || tab !== 'all' ? 'Mos kontent topilmadi' : 'Hali kontent yo‘q'}
              description={search || filterCount || tab !== 'all' ? 'Filtr yoki qidiruvni o‘zgartirib ko‘ring.' : isStaff ? 'Yangi kontentni “+” tugmasi orqali yarating.' : 'SUN MEDIA jamoasi kontent rejalashtirganda shu yerda ko‘rinadi.'}
            />
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.more} color={colors.textTertiary} /> : null}
        renderItem={({ item }) => <ContentCard item={item} showClient={isStaff} isClient={!isStaff} onPress={() => nav.content(item.id)} />}
      />
      {can('content.manage') ? <Fab label="Yangi kontent" onPress={() => nav.go('/content/new')} /> : null}
      <StudioFilterSheet visible={filtering} onClose={() => setFiltering(false)} value={filters} onApply={setFilters} isStaff={isStaff} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120, gap: spacing.md },
  header: { gap: spacing.lg, marginBottom: spacing.xs },
  more: { marginVertical: spacing.lg },
});
