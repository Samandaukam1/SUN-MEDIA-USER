import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, Chip, ChipRow, HeaderButton, NextStep, QueryView, Screen, Text } from '@/components/ui';
import { contentStatusFor, CONTENT_TYPE, PRIORITY } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { formatShortDateTime } from '@/lib/time';
import { fetchContent, fetchTransitions, isContentOverdue, type ContentDetail } from './api';
import { ContentThumb } from './components/ContentThumb';
import { HistorySection, OverviewSection, ScriptSection, TeamSection } from './components/DetailSections';
import { PipelineSteps } from './components/PipelineSteps';
import { StatusSheet } from './components/StatusSheet';
import { ApprovalSection, CommentsSection, MediaSection, PublishingSection, RevisionSection } from './components/WorkflowSections';

// Six places, each with one job. Clients only follow the work: no team, internal checks or history.
const SECTIONS = [
  { key: 'overview', label: 'Asosiy' },
  { key: 'script', label: 'Ssenariy' },
  { key: 'media', label: 'Media' },
  { key: 'team', label: 'Jamoa', staffOnly: true },
  { key: 'approval', label: 'Tekshiruv', staffOnly: true },
  { key: 'history', label: 'Tarix', staffOnly: true },
] as const;
type SectionKey = (typeof SECTIONS)[number]['key'];

export function ContentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can, appInterface } = useAuth();
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
  const isClient = appInterface === 'client';
  const canMove = !isClient && (transitions.data?.length ?? 0) > 0;
  const c = query.data;
  const latest = c ? [...c.versions].sort((a, b) => b.version_number - a.version_number)[0] : undefined;
  const reviewable = !isClient && !!latest && (latest.status === 'internal_review' || latest.status === 'client_review');
  const canUpload = !!c && !isClient && can('files.upload') && (c.status === 'editing' || c.status === 'revision' || c.status === 'shot');
  const primary = canUpload
    ? { title: c!.status === 'revision' ? 'Tuzatilgan versiyani yuklash' : 'Versiya yuklash', icon: 'upload' as const, onPress: () => nav.go(`/content/submit/${c!.id}`) }
    : reviewable
      ? { title: `Versiyani ko‘rish (v${latest!.version_number})`, icon: 'play-circle' as const, onPress: () => nav.review(latest!.id) }
      : null;
  const bar = canMove || !!primary;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: query.data ? [query.data.client?.code, CONTENT_TYPE[query.data.content_type].label, isClient ? null : `#${query.data.number}`].filter(Boolean).join(' ') : 'Kontent',
          headerRight: can('content.manage') && query.data ? () => <HeaderButton icon="edit-2" label="Tahrirlash" onPress={() => nav.go(`/content/edit/${id}`)} /> : undefined,
        }}
      />
      <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()} contentStyle={bar ? { paddingBottom: 120 } : undefined}>
        <QueryView query={query}>
          {(c) => (
            <>
              <Header c={c} isClient={isClient} />
              <ChipRow>
                {SECTIONS.filter((s) => !(isClient && 'staffOnly' in s)).map((s) => (
                  <Chip key={s.key} label={s.label} selected={section === s.key} onPress={() => setSection(s.key)} />
                ))}
              </ChipRow>
              {section === 'overview' ? (
                <>
                  <OverviewSection c={c} isClient={isClient} />
                  {c.publications.some((p) => p.status !== 'cancelled') ? (
                    <>
                      <Text variant="label" tone="tertiary">
                        Post
                      </Text>
                      <PublishingSection c={c} />
                    </>
                  ) : null}
                </>
              ) : null}
              {section === 'script' ? <ScriptSection c={c} /> : null}
              {section === 'media' ? <MediaSection contentId={c.id} clientId={c.client_id} /> : null}
              {section === 'team' ? <TeamSection c={c} /> : null}
              {section === 'approval' ? (
                <>
                  <ApprovalSection c={c} />
                  {c.revisions.length > 0 ? (
                    <>
                      <Text variant="label" tone="tertiary">
                        O‘zgartirishlar
                      </Text>
                      <RevisionSection c={c} />
                    </>
                  ) : null}
                  <Text variant="label" tone="tertiary">
                    Izohlar
                  </Text>
                  <CommentsSection c={c} />
                </>
              ) : null}
              {section === 'history' ? <HistorySection c={c} /> : null}
            </>
          )}
        </QueryView>
      </Screen>
      {bar && query.data ? (
        // One-hand primary actions stay within thumb reach.
        <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {canMove ? (
            <Button
              title={primary ? 'Holat' : 'Holatni o‘zgartirish'}
              icon="git-commit"
              variant={primary ? 'secondary' : 'primary'}
              fullWidth={false}
              style={primary ? styles.side : styles.flex}
              onPress={() => setChanging(true)}
            />
          ) : null}
          {primary ? <Button title={primary.title} icon={primary.icon} fullWidth={false} style={canMove ? styles.main : styles.flex} onPress={primary.onPress} /> : null}
        </View>
      ) : null}
      {query.data ? <StatusSheet visible={changing} onClose={() => setChanging(false)} contentId={query.data.id} current={query.data.status} /> : null}
    </View>
  );
}

/** Who holds the work at this status and by when (the team member for the stage, or the admin for checks). */
function nextStep(c: ContentDetail): { owner: string | null; due: string | null } {
  const person = (...roles: string[]) => {
    for (const role of roles) {
      const p = c.team.find((t) => t.role === role)?.person;
      if (p) return p.full_name;
    }
    return null;
  };
  const post = c.publications.find((p) => p.status !== 'cancelled' && p.scheduled_at)?.scheduled_at ?? null;
  switch (c.status) {
    case 'idea':
    case 'script':
      return { owner: person('copywriter', 'smm_manager'), due: c.due_at };
    case 'ready_for_shoot':
    case 'shooting':
      return { owner: person('operator'), due: c.shooting?.starts_at ?? c.due_at };
    case 'shot':
    case 'editing':
    case 'revision':
      return { owner: person('editor', 'designer'), due: c.due_at };
    case 'internal_review':
    case 'client_review':
      return { owner: person('project_manager') ?? 'Admin', due: c.due_at };
    case 'approved':
    case 'scheduled':
      return { owner: person('smm_manager'), due: post ?? c.due_at };
    default:
      return { owner: person('smm_manager', 'editor', 'designer', 'operator'), due: c.due_at ?? post };
  }
}

function Header({ c, isClient }: { c: ContentDetail; isClient: boolean }) {
  const status = contentStatusFor(c.status, isClient);
  const overdue = !isClient && isContentOverdue(c);
  const step = nextStep(c);
  const post = c.publications.find((p) => p.status !== 'cancelled' && p.scheduled_at)?.scheduled_at ?? null;
  const due = isClient ? post ?? c.due_at : step.due;
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
            {!isClient && (c.priority === 'high' || c.priority === 'urgent') ? <Badge label={PRIORITY[c.priority].label} tone={PRIORITY[c.priority].tone} /> : null}
            {overdue ? <Badge label="Muddati o‘tgan" tone="danger" icon="alert-triangle" /> : null}
          </View>
        </View>
      </View>
      <NextStep
        status={status.label}
        owner={isClient ? 'Admin' : step.owner}
        due={due ? formatShortDateTime(due) : null}
        late={overdue}
      />
      <PipelineSteps status={c.status} isClient={isClient} />
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { gap: spacing.lg },
  headRow: { flexDirection: 'row', gap: spacing.md },
  headText: { flex: 1, gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: 2 },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
  side: { flex: 2 },
  flex: { flex: 1 },
  main: { flex: 3 },
});
