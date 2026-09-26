import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Card, EmptyState, ErrorState, HeaderButton, Icon, SkeletonCards, Text, PullRefreshControl } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { formatAgo } from '@/lib/time';
import { fetchAnnouncements, type Announcement } from './api';
import { AnnouncementForm } from './components/AnnouncementForm';

export function AnnouncementsScreen() {
  const me = useMe();
  const { can } = useAuth();
  const [creating, setCreating] = useState(false);
  const query = useQuery({ queryKey: ['workspace', 'announcements', me.userId], queryFn: () => fetchAnnouncements(me.userId) });
  const { colors } = useTheme();

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'E’lonlar',
          headerRight: can('workspace.manage') ? () => <HeaderButton icon="plus" label="Yangi e’lon" onPress={() => setCreating(true)} /> : undefined,
        }}
      />
      {query.isPending ? (
        <View style={styles.pad}>
          <SkeletonCards count={3} />
        </View>
      ) : query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={query.data}
          keyExtractor={(a) => a.id}
          contentContainerStyle={styles.list}
          refreshControl={<PullRefreshControl busy={query.isRefetching} onRefresh={() => query.refetch()} />}
          ListEmptyComponent={<EmptyState icon="volume-2" title="Hali e’lon yo‘q" description="Kompaniya yangiliklari va muhim xabarlar shu yerda chiqadi." />}
          renderItem={({ item }) => <AnnouncementRow item={item} />}
        />
      )}
      <AnnouncementForm visible={creating} onClose={() => setCreating(false)} />
    </View>
  );
}

export function AnnouncementRow({ item, compact = false }: { item: Announcement; compact?: boolean }) {
  const nav = useNav();
  const { colors } = useTheme();
  return (
    <Card onPress={() => nav.go(`/announcements/${item.id}`)} accessibilityLabel={`${item.title}${item.read ? '' : ', yangi'}`}>
      <View style={styles.head}>
        {item.is_pinned ? <Icon name="bookmark" size={14} color={colors.text} /> : null}
        <Text variant="subheading" numberOfLines={2} style={styles.flex}>
          {item.title}
        </Text>
        {!item.read ? <View style={[styles.dot, { backgroundColor: colors.brand, borderColor: colors.text }]} accessibilityLabel="Yangi" /> : null}
      </View>
      {!compact ? (
        <Text variant="body" tone="secondary" numberOfLines={3} style={styles.body}>
          {item.body}
        </Text>
      ) : null}
      <View style={styles.meta}>
        <Avatar name={item.author?.full_name} url={item.author?.avatar_url} size={20} />
        <Text variant="caption" tone="tertiary" numberOfLines={1} style={styles.flex}>
          {[item.author?.full_name, formatAgo(item.published_at)].filter(Boolean).join(' · ')}
        </Text>
        {item.audience_roles?.length ? <Badge label="Tanlangan rollar" /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { padding: spacing.xl },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.huge },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1 },
  body: { marginTop: spacing.xs },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
});
