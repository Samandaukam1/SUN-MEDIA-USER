import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Badge, Card, Chip, ChipRow, EmptyState, ErrorState, SkeletonCards, Text, PullRefreshControl } from '@/components/ui';
import { CONTENT_TYPE, REVISION_STATUS, VERSION_STATUS } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { ContentThumb } from '@/features/studio/components/ContentThumb';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { formatAgo, formatRelativeDeadline, formatShortDateTime } from '@/lib/time';
import { formatTimecode } from '@/lib/timecode';
import {
  APPROVAL_PAGE,
  fetchApprovalCounts,
  fetchOpenRevisions,
  fetchVersionQueue,
  type ApprovalCounts,
  type ApprovalTab,
  type OpenRevision,
  type QueueVersion,
} from './api';

type Row = { kind: 'version'; item: QueueVersion } | { kind: 'revision'; item: OpenRevision };

function tabsFor(isClient: boolean, approver: boolean, counts: ApprovalCounts | undefined): { value: ApprovalTab; label: string }[] {
  const n = (v: number | undefined) => (v ? ` · ${v}` : '');
  if (isClient) {
    return [
      { value: 'to_review', label: `Kutilmoqda${n(counts?.to_review)}` },
      { value: 'history', label: 'Tarix' },
    ];
  }
  return [
    approver
      ? { value: 'to_review', label: `Tekshirish${n(counts?.to_review)}` }
      : { value: 'to_review', label: `Tekshiruvda${n(counts?.my_in_review)}` },
    { value: 'waiting_client', label: `Mijozda${n(counts?.waiting_client)}` },
    { value: 'revisions', label: `Revision${n(counts?.my_revisions)}` },
    { value: 'history', label: 'Tarix' },
  ];
}

/** Everything waiting for a decision, per role: internal review, the client, revisions, history. */
export function ApprovalsScreen() {
  return <ApprovalsList />;
}

/** The approval queue; the INBOX tab embeds it under its own header. */
export function ApprovalsList({ header, onRefreshAll }: { header?: ReactElement; onRefreshAll?: () => void }) {
  const { can, appInterface } = useAuth();
  const nav = useNav();
  const { colors } = useTheme();
  const isClient = appInterface === 'client';
  const approver = can('approvals.manage');
  const counts = useQuery({ queryKey: ['approvals', 'counts'], queryFn: fetchApprovalCounts });
  const [tab, setTab] = useState<ApprovalTab>(!isClient && !approver && (counts.data?.my_revisions ?? 0) > 0 ? 'revisions' : 'to_review');
  const query = useInfiniteQuery({
    queryKey: ['approvals', 'queue', tab, isClient],
    queryFn: async ({ pageParam }): Promise<Row[]> =>
      tab === 'revisions'
        ? (await fetchOpenRevisions(pageParam)).map((item) => ({ kind: 'revision' as const, item }))
        : (await fetchVersionQueue(tab, isClient, pageParam)).map((item) => ({ kind: 'version' as const, item })),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === APPROVAL_PAGE ? all.length : undefined),
  });
  const rows = query.data?.pages.flat() ?? [];

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {header ? null : <Stack.Screen options={{ title: 'Tasdiqlash markazi' }} />}
      <FlatList
        data={rows}
        keyExtractor={(r) => `${r.kind}-${r.item.id}`}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.4}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        refreshControl={
          <PullRefreshControl
            busy={query.isRefetching && !query.isFetchingNextPage}
            onRefresh={() => {
              query.refetch();
              counts.refetch();
              onRefreshAll?.();
            }}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {header}
            <ChipRow>
              {tabsFor(isClient, approver, counts.data).map((t) => (
                <Chip key={t.value} label={t.label} selected={tab === t.value} onPress={() => setTab(t.value)} />
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
            <EmptyState {...emptyFor(tab, isClient)} />
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.more} color={colors.textTertiary} /> : null}
        renderItem={({ item: row }) =>
          row.kind === 'version' ? (
            <VersionCard v={row.item} isClient={isClient} onPress={() => nav.review(row.item.id)} />
          ) : (
            <RevisionCard r={row.item} onPress={() => (row.item.version_id ? nav.review(row.item.version_id) : nav.content(row.item.content_id))} />
          )
        }
      />
    </View>
  );
}

function emptyFor(tab: ApprovalTab, isClient: boolean) {
  switch (tab) {
    case 'to_review':
      return isClient
        ? { icon: 'check-circle' as const, title: 'Hammasi ko‘rib chiqilgan', description: 'Yangi video yoki dizayn tayyor bo‘lganda shu yerda paydo bo‘ladi.' }
        : { icon: 'check-circle' as const, title: 'Tekshiruv navbati bo‘sh', description: 'Montajyor yangi versiya yuborganda shu yerda ko‘rinadi.' };
    case 'waiting_client':
      return { icon: 'user-check' as const, title: 'Mijoz javobini kutayotgan versiya yo‘q' };
    case 'revisions':
      return { icon: 'rotate-ccw' as const, title: 'Ochiq revision yo‘q', description: 'O‘zgartirish so‘ralganda vaqtli izohlar bilan shu yerda chiqadi.' };
    default:
      return { icon: 'archive' as const, title: 'Tarix hali bo‘sh' };
  }
}

function VersionCard({ v, isClient, onPress }: { v: QueueVersion; isClient: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const c = v.content!;
  const status = VERSION_STATUS[v.status];
  const due = v.status === 'client_review' ? c.client_approval_due_at : null;
  const late = !!due && new Date(due).getTime() < Date.now();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.card}>
        <ContentThumb file={c.thumbnail} type={c.content_type} code={c.client?.code} size={64} />
        <View style={styles.body}>
          <Text variant="micro" tone="tertiary" numberOfLines={1}>
            {[c.client?.name, CONTENT_TYPE[c.content_type].label, `v${v.version_number}`].filter(Boolean).join(' · ').toUpperCase()}
          </Text>
          <Text variant="bodyMedium" numberOfLines={2}>
            {c.title}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {[
              v.file?.duration_ms ? formatTimecode(v.file.duration_ms) : null,
              !isClient ? v.submitter?.full_name : null,
              v.decided_at ? formatShortDateTime(v.decided_at) : formatAgo(v.sent_to_client_at ?? v.submitted_at),
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <View style={styles.badges}>
            <Badge label={status.label} tone={status.tone} icon={status.icon} />
            {due ? <Badge label={formatRelativeDeadline(due) ?? ''} tone={late ? 'danger' : 'neutral'} icon="clock" /> : null}
            {c.revision_count > 0 ? <Badge label={`${c.revision_count} revision`} /> : null}
          </View>
        </View>
      </Card>
      {v.status === 'client_review' && isClient ? <View style={[styles.dot, { backgroundColor: colors.warning }]} /> : null}
    </Pressable>
  );
}

function RevisionCard({ r, onPress }: { r: OpenRevision; onPress: () => void }) {
  const live = r.comments.filter((c) => !c.deleted_at);
  const done = live.filter((c) => c.is_resolved).length;
  const status = REVISION_STATUS[r.status];
  const c = r.content!;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card style={styles.revision}>
        <Text variant="micro" tone="tertiary" numberOfLines={1}>
          {[c.client?.name, CONTENT_TYPE[c.content_type].label, `Revision #${r.revision_number}`, r.stage === 'client' ? 'mijoz' : 'ichki'].filter(Boolean).join(' · ').toUpperCase()}
        </Text>
        <Text variant="bodyMedium" numberOfLines={2}>
          {c.title}
        </Text>
        {r.summary ? (
          <Text variant="body" tone="secondary" numberOfLines={2}>
            {r.summary}
          </Text>
        ) : null}
        <View style={styles.badges}>
          <Badge label={status.label} tone={status.tone} />
          {live.length ? <Badge label={`${done}/${live.length} izoh tuzatildi`} tone={done === live.length ? 'success' : 'neutral'} /> : null}
          <Badge label={formatAgo(r.requested_at)} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: 80 },
  header: { gap: spacing.md, marginBottom: spacing.xs },
  more: { marginVertical: spacing.lg },
  pressed: { opacity: 0.85 },
  card: { flexDirection: 'row', gap: spacing.md },
  body: { flex: 1, gap: 3 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2, marginTop: 4 },
  revision: { gap: spacing.xs + 2 },
  dot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },
});
