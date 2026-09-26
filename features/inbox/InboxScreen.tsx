import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useMemo, useState, type ReactElement } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Chip, ChipRow, EmptyState, ErrorState, Icon, IconButton, ScreenHeader, SkeletonCards, Text, useToast, type IconName, PullRefreshControl } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { ApprovalsList } from '@/features/approvals/ApprovalsScreen';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { notificationPath } from '@/lib/deeplink';
import { useStrings } from '@/lib/i18n';
import { useInterfaceBase, useNav } from '@/lib/routes';
import { formatAgo, formatChatTime } from '@/lib/time';
import {
  chatTitle,
  fetchChats,
  fetchInboxCounts,
  fetchNotifications,
  markNotificationsRead,
  NOTIFICATION_PAGE,
  type AppNotification,
  type ChatSummary,
} from './api';
import { NewChatSheet } from './components/NewChatSheet';

type Tab = 'chats' | 'approvals' | 'notifications';

/** INBOX tab: conversations, what waits for my decision, and everything the system told me. */
export function InboxScreen() {
  const s = useStrings();
  const { appInterface } = useAuth();
  const { colors } = useTheme();
  const counts = useQuery({ queryKey: ['notifications', 'inbox-counts'], queryFn: fetchInboxCounts });
  const [tab, setTab] = useState<Tab>('chats');
  const [composing, setComposing] = useState(false);
  const isStaff = appInterface !== 'client';
  const n = (v: number | undefined) => (v ? ` · ${v}` : '');

  const header = (
    <View style={styles.header}>
      <ScreenHeader
        title={s.nav.inbox}
        right={isStaff && tab === 'chats' ? <IconButton icon="edit" label="Yangi chat" onPress={() => setComposing(true)} /> : undefined}
      />
      <ChipRow>
        <Chip label={`Chatlar${n(counts.data?.chat_rooms_unread)}`} selected={tab === 'chats'} onPress={() => setTab('chats')} />
        <Chip label={`Tasdiqlar${n(counts.data?.approvals)}`} selected={tab === 'approvals'} onPress={() => setTab('approvals')} />
        <Chip label={`Bildirishnomalar${n(counts.data?.notifications_unread)}`} selected={tab === 'notifications'} onPress={() => setTab('notifications')} />
      </ChipRow>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.fill, { backgroundColor: colors.background }]}>
      {tab === 'chats' ? <ChatList header={header} onRefresh={() => counts.refetch()} /> : null}
      {tab === 'approvals' ? <ApprovalsList header={header} onRefreshAll={() => counts.refetch()} /> : null}
      {tab === 'notifications' ? <NotificationList header={header} unread={counts.data?.notifications_unread ?? 0} onRefresh={() => counts.refetch()} /> : null}
      {isStaff ? <NewChatSheet visible={composing} onClose={() => setComposing(false)} /> : null}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Chats
// ---------------------------------------------------------------------------
function ChatList({ header, onRefresh }: { header: ReactElement; onRefresh: () => void }) {
  const nav = useNav();
  const query = useQuery({ queryKey: ['chat', 'list'], queryFn: fetchChats });
  const rooms = (query.data ?? []).filter((r) => !r.archived || r.unread_count > 0);
  return (
    <FlatList
      data={rooms}
      keyExtractor={(r) => r.room_id}
      contentContainerStyle={styles.list}
      refreshControl={
        <PullRefreshControl
          busy={query.isRefetching}
          onRefresh={() => {
            query.refetch();
            onRefresh();
          }}
        />
      }
      ListHeaderComponent={header}
      ListEmptyComponent={
        query.isPending ? (
          <SkeletonCards count={4} />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <EmptyState icon="message-circle" title="Hali chat yo‘q" description="Jamoa va loyiha chatlari shu yerda ko‘rinadi." />
        )
      }
      renderItem={({ item, index }) => <ChatRow room={item} first={index === 0} last={index === rooms.length - 1} onPress={() => nav.chat(item.room_id)} />}
    />
  );
}

function ChatRow({ room, first, last, onPress }: { room: ChatSummary; first: boolean; last: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const me = useMe();
  const unread = room.unread_count > 0;
  const preview = room.last_message_id
    ? room.last_is_system
      ? room.last_message_body
      : `${room.last_sender_id === me.userId ? 'Siz' : (room.last_sender_name?.split(' ')[0] ?? '')}: ${room.last_message_body || (room.last_has_files ? '📎 Fayl' : 'Xabar o‘chirildi')}`
    : room.kind === 'project'
      ? 'Loyiha bo‘yicha savol va fayllar uchun'
      : 'Hali xabar yo‘q';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${chatTitle(room)}${unread ? `, ${room.unread_count} ta o‘qilmagan` : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceSunken : colors.surface, borderColor: colors.border },
        first && styles.firstRow,
        last && styles.lastRow,
        !first && { borderTopWidth: 0 },
      ]}
    >
      <ChatAvatar room={room} />
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text variant={unread ? 'subheading' : 'bodyMedium'} numberOfLines={1} style={styles.flex}>
            {chatTitle(room)}
          </Text>
          {room.muted ? <Icon name="bell-off" size={13} color={colors.textTertiary} /> : null}
          <Text variant="caption" tone={unread ? 'accent' : 'tertiary'}>
            {room.last_message_at ? formatChatTime(room.last_message_at) : ''}
          </Text>
        </View>
        <View style={styles.titleRow}>
          <Text variant="caption" tone={unread ? 'primary' : 'secondary'} numberOfLines={1} style={styles.flex}>
            {preview}
          </Text>
          {unread ? (
            <View style={[styles.unread, { backgroundColor: room.muted ? colors.textTertiary : colors.brand }]}>
              <Text variant="micro" style={{ color: room.muted ? colors.surface : colors.onBrand }}>
                {room.unread_count > 99 ? '99+' : room.unread_count}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function ChatAvatar({ room, size = 46 }: { room: Pick<ChatSummary, 'kind' | 'client_code' | 'client_logo' | 'peer_name' | 'peer_avatar' | 'is_default'>; size?: number }) {
  const { colors } = useTheme();
  if (room.kind === 'direct') return <Avatar name={room.peer_name} url={room.peer_avatar} size={size} />;
  if (room.kind === 'project') return <Avatar name={room.client_code} url={room.client_logo} size={size} />;
  return (
    <View style={[styles.groupIcon, { width: size, height: size, borderRadius: size / 2, backgroundColor: room.is_default ? colors.hero : colors.surfaceSunken }]}>
      <Icon name={room.is_default ? 'sun' : 'users'} size={size * 0.42} color={room.is_default ? colors.brand : colors.text} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
const TYPE_ICON: { prefix: string; icon: IconName }[] = [
  { prefix: 'approval', icon: 'check-circle' },
  { prefix: 'deadline', icon: 'clock' },
  { prefix: 'task', icon: 'check-square' },
  { prefix: 'shooting', icon: 'video' },
  { prefix: 'content', icon: 'film' },
  { prefix: 'announcement', icon: 'volume-2' },
  { prefix: 'plan', icon: 'credit-card' },
  { prefix: 'report', icon: 'bar-chart-2' },
  { prefix: 'attendance', icon: 'user-check' },
];

function iconFor(type: string): IconName {
  return TYPE_ICON.find((t) => type.startsWith(t.prefix))?.icon ?? 'bell';
}

function NotificationList({ header, unread, onRefresh }: { header: ReactElement; unread: number; onRefresh: () => void }) {
  const me = useMe();
  const router = useRouter();
  const base = useInterfaceBase();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const query = useInfiniteQuery({
    queryKey: ['notifications', 'list', me.userId],
    queryFn: ({ pageParam }) => fetchNotifications(me.userId, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === NOTIFICATION_PAGE ? all.length : undefined),
  });
  const items = useMemo(() => query.data?.pages.flat() ?? [], [query.data]);
  const markAll = useMutation({
    mutationFn: () => markNotificationsRead(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    onError: toast.error,
  });

  const open = (n: AppNotification) => {
    if (!n.read_at) markNotificationsRead([n.id]).then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }), () => undefined);
    const data = (n.data ?? {}) as { route?: unknown };
    const path = notificationPath(data.route, me.kind === 'staff' ? 'staff' : 'client');
    if (path) router.push(`${base}${path}` as Href);
  };

  return (
    <FlatList
      data={items}
      keyExtractor={(n) => n.id}
      contentContainerStyle={styles.list}
      onEndReachedThreshold={0.4}
      onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
      refreshControl={
        <PullRefreshControl
          busy={query.isRefetching && !query.isFetchingNextPage}
          onRefresh={() => {
            query.refetch();
            onRefresh();
          }}
        />
      }
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          {unread > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => markAll.mutate()} style={styles.markAll} hitSlop={8}>
              <Icon name="check" size={14} color={colors.textSecondary} />
              <Text variant="captionMedium" tone="secondary">
                Hammasini o‘qilgan deb belgilash
              </Text>
            </Pressable>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        query.isPending ? (
          <SkeletonCards count={4} />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <EmptyState icon="bell" title="Bildirishnoma yo‘q" description="Vazifa, tasdiq, syomka va muddatlar haqidagi xabarlar shu yerda to‘planadi." />
        )
      }
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.more} color={colors.textTertiary} /> : null}
      renderItem={({ item, index }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.title}${item.read_at ? '' : ', o‘qilmagan'}`}
          onPress={() => open(item)}
          style={({ pressed }) => [
            styles.row,
            styles.notification,
            { backgroundColor: pressed ? colors.surfaceSunken : colors.surface, borderColor: colors.border },
            index === 0 && styles.firstRow,
            index === items.length - 1 && styles.lastRow,
            index > 0 && { borderTopWidth: 0 },
          ]}
        >
          <View style={[styles.typeIcon, { backgroundColor: item.priority === 'high' ? colors.dangerSoft : colors.surfaceSunken }]}>
            <Icon name={iconFor(item.type)} size={18} color={item.priority === 'high' ? colors.danger : colors.text} />
          </View>
          <View style={styles.flex}>
            <Text variant={item.read_at ? 'bodyMedium' : 'subheading'} numberOfLines={2}>
              {item.title}
            </Text>
            {item.body ? (
              <Text variant="caption" tone="secondary" numberOfLines={3}>
                {item.body}
              </Text>
            ) : null}
            <Text variant="caption" tone="tertiary">
              {formatAgo(item.created_at)}
            </Text>
          </View>
          {item.read_at ? null : <View style={[styles.dot, { backgroundColor: colors.brand, borderColor: colors.accent }]} />}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120 },
  header: { gap: spacing.lg, marginBottom: spacing.md },
  more: { marginVertical: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: StyleSheet.hairlineWidth },
  notification: { alignItems: 'flex-start' },
  firstRow: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  lastRow: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unread: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  groupIcon: { alignItems: 'center', justifyContent: 'center' },
  typeIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6, borderWidth: 1 },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-end' },
});
