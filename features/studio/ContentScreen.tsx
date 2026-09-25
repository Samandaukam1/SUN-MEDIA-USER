import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, Chip, ChipRow, HeaderButton, QueryView, Screen, Text } from '@/components/ui';
import { CONTENT_STATUS, CONTENT_TYPE, PRIORITY } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { fetchContent, fetchTransitions, isContentOverdue, type ContentDetail } from './api';
import { ContentThumb } from './components/ContentThumb';
import { HistorySection, OverviewSection, ScriptSection, TeamSection, TimelineSection } from './components/DetailSections';
import { PipelineSteps } from './components/PipelineSteps';
import { StatusSheet } from './components/StatusSheet';
import { ApprovalSection, CommentsSection, MediaSection, PublishingSection, RevisionSection } from './components/WorkflowSections';

const SECTIONS = [
  { key: 'overview', label: 'Umumiy' },
  { key: 'script', label: 'Ssenariy' },
  { key: 'media', label: 'Media' },
  { key: 'team', label: 'Jamoa' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'approval', label: 'Tasdiqlash' },
  { key: 'revision', label: 'Revision' },
  { key: 'publishing', label: 'Nashr' },
  { key: 'comments', label: 'Izohlar' },
  { key: 'history', label: 'Tarix' },
] as const;
type SectionKey = (typeof SECTIONS)[number]['key'];

export function ContentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const nav = useNav();
  const query = useQuery({ queryKey: ['content', 'detail', id], queryFn: () => fetchContent(id), enabled: !!id });
  const transitions = useQuery({
    queryKey: ['content', 'transitions', id, query.data?.status],
    queryFn: () => fetchTransitions(id),
    enabled: !!query.data,
  });
  const [section, setSection] = useState<SectionKey>('overview');
  const [changing, setChanging] = useState(false);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const canMove = (transitions.data?.length ?? 0) > 0;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: query.data ? `${query.data.client?.code ?? ''} ${CONTENT_TYPE[query.data.content_type].label} #${query.data.number}` : 'Kontent',
          headerRight: can('content.manage') && query.data ? () => <HeaderButton icon="edit-2" label="Tahrirlash" onPress={() => nav.go(`/content/edit/${id}`)} /> : undefined,
        }}
      />
      <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()} contentStyle={canMove ? { paddingBottom: 120 } : undefined}>
        <QueryView query={query}>
          {(c) => (
            <>
              <Header c={c} />
              <ChipRow>
                {SECTIONS.map((s) => (
                  <Chip key={s.key} label={s.label} selected={section === s.key} onPress={() => setSection(s.key)} />
                ))}
              </ChipRow>
              {section === 'overview' ? <OverviewSection c={c} /> : null}
              {section === 'script' ? <ScriptSection c={c} /> : null}
              {section === 'media' ? <MediaSection contentId={c.id} /> : null}
              {section === 'team' ? <TeamSection c={c} /> : null}
              {section === 'timeline' ? <TimelineSection c={c} /> : null}
              {section === 'approval' ? <ApprovalSection c={c} /> : null}
              {section === 'revision' ? <RevisionSection c={c} /> : null}
              {section === 'publishing' ? <PublishingSection c={c} /> : null}
              {section === 'comments' ? <CommentsSection c={c} /> : null}
              {section === 'history' ? <HistorySection c={c} /> : null}
            </>
          )}
        </QueryView>
      </Screen>
      {canMove && query.data ? (
        // One-hand primary action stays within thumb reach.
        <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Button title="Holatni o‘zgartirish" icon="git-commit" onPress={() => setChanging(true)} />
        </View>
      ) : null}
      {query.data ? <StatusSheet visible={changing} onClose={() => setChanging(false)} contentId={query.data.id} current={query.data.status} /> : null}
    </View>
  );
}

function Header({ c }: { c: ContentDetail }) {
  const status = CONTENT_STATUS[c.status];
  const overdue = isContentOverdue(c);
  return (
    <Card style={styles.header}>
      <View style={styles.headRow}>
        <ContentThumb file={c.thumbnail} type={c.content_type} code={c.client?.code} size={76} />
        <View style={styles.headText}>
          <Text variant="micro" tone="tertiary">
            {[c.client?.name, CONTENT_TYPE[c.content_type].label].filter(Boolean).join(' · ').toUpperCase()}
          </Text>
          <Text variant="title" numberOfLines={3}>
            {c.title}
          </Text>
          <View style={styles.badges}>
            <Badge label={status.label} tone={status.tone} icon={status.icon} />
            {c.priority === 'high' || c.priority === 'urgent' ? <Badge label={PRIORITY[c.priority].label} tone={PRIORITY[c.priority].tone} /> : null}
            {overdue ? <Badge label="Muddati o‘tgan" tone="danger" icon="alert-triangle" /> : null}
            {c.revision_count > 0 ? <Badge label={`${c.revision_count} revision`} tone="danger" /> : null}
          </View>
        </View>
      </View>
      <PipelineSteps status={c.status} />
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { gap: spacing.lg },
  headRow: { flexDirection: 'row', gap: spacing.md },
  headText: { flex: 1, gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: 2 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
