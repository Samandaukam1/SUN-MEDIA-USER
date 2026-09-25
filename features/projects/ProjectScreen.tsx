import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Counters, EmptyState, HeaderButton, ItemRow, QueryView, Screen, Section, Text } from '@/components/ui';
import { PROJECT_KIND, PROJECT_STATUS, SHOOTING_STATUS, TEAM_ROLE_LABEL } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchStudioPage, isContentOverdue, STUDIO_PAGE } from '@/features/studio/api';
import { ContentCard } from '@/features/studio/components/ContentCard';
import { useNav } from '@/lib/routes';
import { formatDateKey, formatShortDateTime } from '@/lib/time';
import type { Database } from '@/types/database';
import { fetchProject } from './api';

type Enums = Database['public']['Enums'];

export function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const nav = useNav();
  const project = useQuery({ queryKey: ['projects', 'detail', id], queryFn: () => fetchProject(id), enabled: !!id });
  const content = useInfiniteQuery({
    queryKey: ['content', 'studio', { projectId: id, sort: 'deadline' }],
    queryFn: ({ pageParam }) => fetchStudioPage({ projectId: id, sort: 'deadline' }, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === STUDIO_PAGE ? all.length : undefined),
    enabled: !!id,
  });
  const items = content.data?.pages.flat() ?? [];
  const live = items.filter((i) => i.status !== 'cancelled');
  const done = live.filter((i) => ['approved', 'scheduled', 'published'].includes(i.status)).length;
  const overdue = live.filter((i) => isContentOverdue(i)).length;

  return (
    <Screen edges={[]} refreshing={project.isRefetching} onRefresh={() => { project.refetch(); content.refetch(); }}>
      <Stack.Screen
        options={{
          title: project.data?.name ?? 'Loyiha',
          headerRight: can('projects.manage') && project.data ? () => <HeaderButton icon="edit-2" label="Tahrirlash" onPress={() => nav.go(`/projects/edit/${id}`)} /> : undefined,
        }}
      />
      <QueryView query={project}>
        {(p) => (
          <>
            <Card style={styles.header}>
              <View style={styles.row}>
                <Avatar name={p.client?.name} url={p.client?.logo_url} size={48} />
                <View style={styles.flex}>
                  <Text variant="micro" tone="tertiary">
                    {[p.client?.name, PROJECT_KIND[p.kind]].filter(Boolean).join(' · ').toUpperCase()}
                  </Text>
                  <Text variant="title">{p.name}</Text>
                </View>
              </View>
              <View style={styles.badges}>
                <Badge label={PROJECT_STATUS[p.status].label} tone={PROJECT_STATUS[p.status].tone} />
                {p.starts_on || p.ends_on ? (
                  <Badge label={[p.starts_on ? formatDateKey(p.starts_on) : '…', p.ends_on ? formatDateKey(p.ends_on, true) : '…'].join(' — ')} icon="calendar" />
                ) : null}
              </View>
              <Counters
                items={[
                  { label: 'Kontent', value: live.length },
                  { label: 'Tayyor', value: done, tone: done ? 'success' : 'primary' },
                  { label: 'Overdue', value: overdue, tone: overdue ? 'danger' : 'primary' },
                  { label: 'Syomka', value: p.shootings.length },
                ]}
              />
              {p.description ? (
                <Text variant="body" tone="secondary">
                  {p.description}
                </Text>
              ) : null}
            </Card>

            <Section title={`Jamoa · ${p.members.length}`}>
              {p.members.length === 0 ? (
                <EmptyState icon="users" title="Jamoa biriktirilmagan" />
              ) : (
                <Card padded={false}>
                  {p.members.map((m, i) =>
                    m.person ? (
                      <ItemRow
                        key={`${m.person.id}:${m.team_role}`}
                        first={i === 0}
                        leading={<Avatar name={m.person.full_name} url={m.person.avatar_url} size={32} />}
                        title={m.person.full_name}
                        subtitle={TEAM_ROLE_LABEL[m.team_role as Enums['team_role']]}
                        onPress={() => nav.employee(m.person!.id)}
                      />
                    ) : null,
                  )}
                </Card>
              )}
            </Section>

            {p.shootings.length ? (
              <Section title="Yaqin syomkalar">
                <Card padded={false}>
                  {p.shootings.map((s, i) => (
                    <ItemRow
                      key={s.id}
                      first={i === 0}
                      icon="video"
                      title={s.title}
                      subtitle={[formatShortDateTime(s.starts_at), s.location_name].filter(Boolean).join(' · ')}
                      right={<Badge label={SHOOTING_STATUS[s.status as Enums['shooting_status']].label} tone={SHOOTING_STATUS[s.status as Enums['shooting_status']].tone} />}
                    />
                  ))}
                </Card>
              </Section>
            ) : null}

            <Section title={`Kontent · ${live.length}`} actionLabel={can('content.manage') ? 'Qo‘shish' : undefined} onAction={() => nav.go(`/content/new?clientId=${p.client_id}&projectId=${p.id}`)}>
              {content.isPending ? null : items.length === 0 ? (
                <EmptyState icon="film" title="Loyihada hali kontent yo‘q" />
              ) : (
                items.map((item) => <ContentCard key={item.id} item={item} showClient={false} onPress={() => nav.content(item.id)} />)
              )}
              {content.hasNextPage ? <Button title="Yana yuklash" variant="secondary" size="md" loading={content.isFetchingNextPage} onPress={() => content.fetchNextPage()} /> : null}
            </Section>
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
