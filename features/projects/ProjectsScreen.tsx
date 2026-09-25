import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar, AvatarStack, Badge, Card, EmptyState, ErrorState, HeaderButton, ProgressBar, SearchField, SegmentedControl, SkeletonCards, Text } from '@/components/ui';
import { PROJECT_KIND, PROJECT_STATUS } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { formatDateShort, formatRelativeDeadline } from '@/lib/time';
import { fetchProjects, type ProjectGroup, type ProjectSummary } from './api';

export function ProjectsScreen() {
  const { can } = useAuth();
  const nav = useNav();
  const { colors } = useTheme();
  const [group, setGroup] = useState<ProjectGroup>('active');
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['projects', group, search], queryFn: () => fetchProjects(group, search) });

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Loyihalar',
          headerRight: can('projects.manage') ? () => <HeaderButton icon="plus" label="Yangi loyiha" onPress={() => nav.go('/projects/new')} /> : undefined,
        }}
      />
      <FlatList
        data={query.data ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <SegmentedControl
              options={[
                { value: 'active', label: 'Faol' },
                { value: 'completed', label: 'Yakunlangan' },
                { value: 'archived', label: 'Arxiv' },
              ]}
              value={group}
              onChange={setGroup}
            />
            <SearchField value={search} onChangeText={setSearch} placeholder="Loyiha nomi" />
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <SkeletonCards count={3} />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : (
            <EmptyState icon="folder" title={search ? 'Loyiha topilmadi' : 'Bu bo‘limda loyiha yo‘q'} description="Mijoz uchun oylik xizmat yoki kampaniya loyihasini yarating." />
          )
        }
        renderItem={({ item }) => <ProjectCard project={item} onPress={() => nav.project(item.id)} />}
      />
    </View>
  );
}

function ProjectCard({ project, onPress }: { project: ProjectSummary; onPress: () => void }) {
  const status = PROJECT_STATUS[project.status];
  const people = [...new Map(project.members.map((m) => m.person).filter((p): p is NonNullable<typeof p> => !!p).map((p) => [p.id, p])).values()];
  return (
    <Card onPress={onPress} accessibilityLabel={`${project.name}, ${status.label}`}>
      <View style={styles.row}>
        <Avatar name={project.client?.name} url={project.client?.logo_url} size={40} />
        <View style={styles.body}>
          <Text variant="micro" tone="tertiary">
            {[project.client?.name, PROJECT_KIND[project.kind]].filter(Boolean).join(' · ').toUpperCase()}
          </Text>
          <Text variant="subheading" numberOfLines={2}>
            {project.name}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} />
      </View>
      <View style={styles.progressRow}>
        <View style={styles.flex}>
          <ProgressBar value={project.progress} label="Loyiha jarayoni" />
        </View>
        <Text variant="captionMedium" style={styles.count}>
          {project.done}/{project.total}
        </Text>
      </View>
      <View style={styles.footer}>
        {people.length ? <AvatarStack people={people.map((p) => ({ id: p.id, name: p.full_name, avatarUrl: p.avatar_url }))} size={22} /> : null}
        <Text variant="caption" tone="secondary" style={styles.flex} numberOfLines={1}>
          {project.nextDeadline
            ? `Keyingi muddat: ${formatDateShort(project.nextDeadline)} · ${formatRelativeDeadline(project.nextDeadline)}`
            : project.ends_on
              ? `Tugaydi: ${formatDateShort(project.ends_on)}`
              : 'Muddat belgilanmagan'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.huge },
  header: { gap: spacing.md, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  flex: { flex: 1 },
  count: { fontVariant: ['tabular-nums'] },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
});
