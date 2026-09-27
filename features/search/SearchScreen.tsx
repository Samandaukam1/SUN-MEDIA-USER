import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar, Card, EmptyState, ErrorState, Icon, ItemRow, Screen, SearchField, Section, Text, type IconName } from '@/components/ui';
import { CONTENT_STATUS, CONTENT_TYPE, SHOOTING_STATUS, TASK_STATUS } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import type { Database } from '@/types/database';
import { globalSearch, type SearchHit } from './api';

type Enums = Database['public']['Enums'];

const GROUPS: { kind: SearchHit['kind']; title: string; icon: IconName; staffOnly?: boolean }[] = [
  { kind: 'content', title: 'Kontent', icon: 'film' },
  { kind: 'task', title: 'Vazifalar', icon: 'check-square', staffOnly: true },
  { kind: 'shooting', title: 'Syomkalar', icon: 'video' },
  { kind: 'project', title: 'Loyihalar', icon: 'folder' },
  { kind: 'client', title: 'Mijozlar', icon: 'briefcase', staffOnly: true },
  { kind: 'file', title: 'Fayllar', icon: 'file' },
  { kind: 'person', title: 'Jamoa', icon: 'user', staffOnly: true },
];

function statusLabel(hit: SearchHit): string | null {
  if (!hit.status) return null;
  if (hit.kind === 'content') return CONTENT_STATUS[hit.status as Enums['content_status']]?.label ?? null;
  if (hit.kind === 'task') return TASK_STATUS[hit.status as Enums['task_status']]?.label ?? null;
  if (hit.kind === 'shooting') return SHOOTING_STATUS[hit.status as Enums['shooting_status']]?.label ?? null;
  return null;
}

/** One box for everything: content, tasks, shootings, projects, clients, files and people. */
export function SearchScreen() {
  const { appInterface } = useAuth();
  const nav = useNav();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const isClient = appInterface === 'client';

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setQuery(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text]);

  const search = useQuery({ queryKey: ['search', query], queryFn: () => globalSearch(query), enabled: query.length >= 2, staleTime: 15_000 });
  const grouped = useMemo(() => {
    const hits = search.data ?? [];
    return GROUPS.filter((g) => !(isClient && g.staffOnly))
      .map((g) => ({ ...g, hits: hits.filter((h) => h.kind === g.kind) }))
      .filter((g) => g.hits.length);
  }, [search.data, isClient]);

  const open = (hit: SearchHit) => {
    switch (hit.kind) {
      case 'content':
        return nav.content(hit.id);
      case 'task':
        return nav.task(hit.id);
      case 'shooting':
        return nav.shooting(hit.id);
      case 'project':
        return nav.project(hit.id);
      case 'client':
        return nav.client(hit.id);
      case 'file':
        return nav.file(hit.id);
      case 'person':
        return nav.employee(hit.id);
    }
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Qidiruv' }} />
      <SearchField value={text} onChangeText={setText} placeholder={isClient ? 'Kontent, syomka, fayl…' : 'Kontent, vazifa, mijoz, fayl, xodim…'} autoFocus />
      {query.length < 2 ? (
        <View style={styles.hint}>
          <Icon name="search" size={28} color={colors.textTertiary} />
          <Text variant="caption" tone="tertiary" align="center">
            {isClient ? 'Kontent nomi, syomka joyi yoki fayl nomini yozing.' : 'Kamida 2 ta harf. Kontent raqami bo‘yicha ham qidiradi (#12).'}
          </Text>
        </View>
      ) : search.isPending ? (
        <ActivityIndicator style={styles.loading} color={colors.textTertiary} />
      ) : search.error ? (
        <ErrorState error={search.error} onRetry={() => search.refetch()} />
      ) : grouped.length === 0 ? (
        <EmptyState icon="search" title="Hech narsa topilmadi" description={`“${query}” bo‘yicha natija yo‘q.`} />
      ) : (
        grouped.map((g) => (
          <Section key={g.kind} title={g.title}>
            <Card padded={false}>
              {g.hits.map((hit, i) => {
                const status = statusLabel(hit);
                return (
                  <ItemRow
                    key={`${hit.kind}-${hit.id}`}
                    first={i === 0}
                    icon={hit.kind === 'person' ? undefined : g.icon}
                    leading={hit.kind === 'person' ? <Avatar name={hit.title} url={hit.avatar_url} size={32} /> : undefined}
                    title={hit.title}
                    subtitle={
                      [
                        hit.subtitle,
                        hit.kind === 'content' && hit.content_type ? `${CONTENT_TYPE[hit.content_type as Enums['content_type']]?.label ?? hit.content_type} #${hit.number}` : null,
                        status,
                      ]
                        .filter(Boolean)
                        .join(' · ') || null
                    }
                    onPress={() => open(hit)}
                  />
                );
              })}
            </Card>
          </Section>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.huge, paddingHorizontal: spacing.xl },
  loading: { marginTop: spacing.xl },
});
