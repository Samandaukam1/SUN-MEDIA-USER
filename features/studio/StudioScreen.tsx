import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip, ChipRow, EmptyState, ErrorState, Fab, IconButton, ScreenHeader, SearchField, SkeletonCards } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useStrings } from '@/lib/i18n';
import { useNav } from '@/lib/routes';
import { fetchStudioPage, STUDIO_PAGE, type ContentStatus, type StudioFilters } from './api';
import { ContentCard } from './components/ContentCard';
import { countActiveFilters, StudioFilterSheet } from './components/StudioFilterSheet';

type Tab = { key: string; label: string; statuses: ContentStatus[] | null };

const STAFF_TABS: Tab[] = [
  { key: 'all', label: 'Barchasi', statuses: null },
  { key: 'idea', label: 'G‘oya', statuses: ['idea'] },
  { key: 'script', label: 'Ssenariy', statuses: ['script'] },
  { key: 'shooting', label: 'Syomka', statuses: ['ready_for_shoot', 'shooting', 'shot'] },
  { key: 'editing', label: 'Montaj', statuses: ['editing'] },
  { key: 'internal', label: 'Ichki tekshiruv', statuses: ['internal_review'] },
  { key: 'client', label: 'Mijozda', statuses: ['client_review'] },
  { key: 'revision', label: 'Revision', statuses: ['revision'] },
  { key: 'approved', label: 'Tasdiqlandi', statuses: ['approved'] },
  { key: 'scheduled', label: 'Rejalashtirildi', statuses: ['scheduled'] },
  { key: 'published', label: 'Joylandi', statuses: ['published'] },
];

// Clients think in outcomes: what is being made, what needs me, what is live.
const CLIENT_TABS: Tab[] = [
  { key: 'all', label: 'Barchasi', statuses: null },
  { key: 'production', label: 'Jarayonda', statuses: ['script', 'ready_for_shoot', 'shooting', 'shot', 'editing', 'internal_review'] },
  { key: 'client', label: 'Tasdiqlash kerak', statuses: ['client_review'] },
  { key: 'revision', label: 'Revision', statuses: ['revision'] },
  { key: 'approved', label: 'Tasdiqlandi', statuses: ['approved', 'scheduled'] },
  { key: 'published', label: 'Joylandi', statuses: ['published'] },
];

export function StudioScreen() {
  const me = useMe();
  const { can } = useAuth();
  const nav = useNav();
  const s = useStrings();
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

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: colors.background }]}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.4}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader
              title={s.nav.studio}
              subtitle={isStaff ? 'Kontent ishlab chiqarish markazi' : 'Sizning kontentingiz — g‘oyadan nashrgacha'}
              right={<IconButton icon="sliders" label={`Filtr${filterCount ? `, ${filterCount} faol` : ''}`} onPress={() => setFiltering(true)} badge={filterCount} />}
            />
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
        renderItem={({ item }) => <ContentCard item={item} showClient={isStaff} onPress={() => nav.content(item.id)} />}
      />
      {can('content.manage') ? <Fab label="Yangi kontent" onPress={() => nav.go('/content/new')} /> : null}
      <StudioFilterSheet visible={filtering} onClose={() => setFiltering(false)} value={filters} onApply={setFilters} isStaff={isStaff} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120, gap: spacing.md },
  header: { gap: spacing.lg, marginBottom: spacing.xs },
  more: { marginVertical: spacing.lg },
});
