import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

import { Avatar, EmptyState, ErrorState, Icon, IconButton, ProgressBar, Skeleton, Text, useToast } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { mimeIcon } from '@/features/files/components/UploadList';
import { pickForUpload } from '@/features/files/pick';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { useSignedUrl } from '@/lib/storage';
import { getSupabase } from '@/lib/supabase';
import { agencyDateKey, formatDateKey, formatTime } from '@/lib/time';
import { formatBytes, startUpload, UploadCancelled, type UploadHandle } from '@/lib/upload';
import { chatTitle, deleteMessage, editMessage, fetchMessages, fetchRoom, markChatRead, MESSAGE_PAGE, sendMessage, type ChatMessage, type RoomDetail } from './api';
import { RoomInfoSheet } from './components/RoomInfoSheet';

type Pending = { key: string; name: string; mime: string; size: number; sent: number; fileId: string | null; error: string | null; handle: UploadHandle | null };

const TYPING_TTL_MS = 4000;
const GROUP_GAP_MS = 5 * 60_000;

export function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const room = useQuery({ queryKey: ['chat', 'room', id], queryFn: () => fetchRoom(id), enabled: !!id });
  const { colors } = useTheme();
  if (room.data) return <ChatBody room={room.data} />;
  return (
    <View style={[styles.fill, styles.pad, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Chat' }} />
      {room.isPending ? (
        <Skeleton height={60} />
      ) : room.error ? (
        <ErrorState error={room.error} onRetry={() => room.refetch()} />
      ) : (
        <EmptyState icon="message-circle" title="Chat topilmadi" description="Siz bu chat a’zosi emassiz yoki u o‘chirilgan." />
      )}
    </View>
  );
}

function ChatBody({ room }: { room: RoomDetail }) {
  const me = useMe();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [typing, setTyping] = useState<{ name: string; at: number } | null>(null);
  const [info, setInfo] = useState(false);
  const channel = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);
  const lastTypingSent = useRef(0);
  const archived = !!room.archived_at;
  const peer = room.kind === 'direct' ? room.members.find((m) => m.user_id !== me.userId)?.person : null;
  const title = chatTitle({ kind: room.kind, name: room.name, is_default: room.is_default, peer_name: peer?.full_name ?? null });
  const showNames = room.kind !== 'direct';

  const messages = useInfiniteQuery({
    queryKey: ['chat', 'messages', room.id],
    queryFn: ({ pageParam }) => fetchMessages(room.id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length === MESSAGE_PAGE ? last[last.length - 1].created_at : undefined),
  });
  const list = useMemo(() => messages.data?.pages.flat() ?? [], [messages.data]);
  const byId = useMemo(() => new Map(list.map((m) => [m.id, m])), [list]);

  const markRead = useCallback(() => {
    markChatRead(room.id).then(
      () => {
        queryClient.invalidateQueries({ queryKey: ['chat', 'list'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'inbox-counts'] });
      },
      () => undefined,
    );
  }, [room.id, queryClient]);

  // Live room: new/edited messages and typing indicators arrive on the private room topic.
  useEffect(() => {
    const supabase = getSupabase();
    const ch = supabase
      .channel(`room:${room.id}`, { config: { private: true } })
      .on('broadcast', { event: 'message' }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', room.id] });
        markRead();
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const p = payload as { user_id?: string; name?: string };
        if (p.user_id && p.user_id !== me.userId) setTyping({ name: p.name ?? 'Kimdir', at: Date.now() });
      })
      .subscribe();
    channel.current = ch;
    markRead();
    return () => {
      channel.current = null;
      supabase.removeChannel(ch);
    };
  }, [room.id, me.userId, markRead, queryClient]);

  useEffect(() => {
    if (!typing) return;
    const t = setTimeout(() => setTyping(null), TYPING_TTL_MS);
    return () => clearTimeout(t);
  }, [typing]);

  // Uploads that never got sent are cancelled when the screen closes.
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => () => pendingRef.current.forEach((p) => p.handle?.cancel()), []);

  const onChangeText = (value: string) => {
    setText(value);
    const now = Date.now();
    if (value && now - lastTypingSent.current > 2500 && channel.current) {
      lastTypingSent.current = now;
      channel.current.send({ type: 'broadcast', event: 'typing', payload: { user_id: me.userId, name: me.profile?.full_name?.split(' ')[0] ?? '' } }).catch(() => undefined);
    }
  };

  const attach = async () => {
    const picked = await pickForUpload();
    picked.forEach((source) => {
      const key = `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      if (!source.size) {
        toast.show(`${source.name}: hajmi aniqlanmadi`, 'error');
        return;
      }
      const handle = startUpload(source, { chatRoomId: room.id }, (sent) => setPending((all) => all.map((p) => (p.key === key ? { ...p, sent } : p))));
      setPending((all) => [...all, { key, name: source.name, mime: source.mimeType, size: source.size, sent: 0, fileId: null, error: null, handle }]);
      handle.promise.then(
        (file) => setPending((all) => all.map((p) => (p.key === key ? { ...p, sent: p.size, fileId: file.id, handle: null } : p))),
        (e) =>
          setPending((all) =>
            e instanceof UploadCancelled ? all.filter((p) => p.key !== key) : all.map((p) => (p.key === key ? { ...p, error: 'Yuklanmadi', handle: null } : p)),
          ),
      );
    });
  };

  const uploading = pending.some((p) => !p.fileId && !p.error);
  const ready = pending.filter((p) => p.fileId).map((p) => p.fileId!);
  const canSend = !archived && !uploading && (!!text.trim() || ready.length > 0);

  const send = useMutation({
    mutationFn: async () => {
      if (editing) return editMessage(editing.id, text);
      return sendMessage(room.id, text, replyTo?.id ?? null, ready);
    },
    onSuccess: () => {
      setText('');
      setReplyTo(null);
      setEditing(null);
      setPending((all) => all.filter((p) => !p.fileId));
      queryClient.invalidateQueries({ queryKey: ['chat'] });
    },
    onError: toast.error,
  });

  const remove = useMutation({
    mutationFn: (mid: string) => deleteMessage(mid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
    onError: toast.error,
  });

  const openActions = (m: ChatMessage) => {
    if (m.is_system || m.deleted_at) return;
    const mine = m.sender_id === me.userId;
    const actions: { label: string; destructive?: boolean; run: () => void }[] = [];
    if (!archived) actions.push({ label: 'Javob berish', run: () => setReplyTo(m) });
    if (m.body) actions.push({ label: 'Ulashish', run: () => Share.share({ message: m.body }).catch(() => undefined) });
    if (mine && m.body && !archived)
      actions.push({
        label: 'Tahrirlash',
        run: () => {
          setEditing(m);
          setReplyTo(null);
          setText(m.body);
        },
      });
    if (mine)
      actions.push({
        label: 'O‘chirish',
        destructive: true,
        run: () =>
          Alert.alert('Xabarni o‘chirasizmi?', 'Hamma uchun o‘chiriladi.', [
            { text: 'Bekor qilish', style: 'cancel' },
            { text: 'O‘chirish', style: 'destructive', onPress: () => remove.mutate(m.id) },
          ]),
      });
    if (!actions.length) return;
    if (Platform.OS === 'ios') {
      const labels = [...actions.map((a) => a.label), 'Bekor qilish'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: actions.findIndex((a) => a.destructive) },
        (i) => actions[i]?.run(),
      );
    } else {
      Alert.alert('Xabar', undefined, [...actions.map((a) => ({ text: a.label, onPress: a.run })), { text: 'Bekor qilish', style: 'cancel' }]);
    }
  };

  const subtitle = typing
    ? `${typing.name} yozmoqda…`
    : room.kind === 'direct'
      ? 'Shaxsiy chat'
      : room.kind === 'project'
        ? `${room.client?.name ?? 'Mijoz'} · ${room.members.length} a’zo`
        : `${room.members.length} a’zo`;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${title}, chat ma’lumotlari`} onPress={() => setInfo(true)} style={styles.headerTitle}>
              <Text variant="heading" numberOfLines={1}>
                {title}
              </Text>
              <Text variant="caption" tone={typing ? 'accent' : 'tertiary'} numberOfLines={1}>
                {subtitle}
              </Text>
            </Pressable>
          ),
        }}
      />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={headerHeight}>
        <FlatList
          inverted
          data={list}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messages}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onEndReachedThreshold={0.3}
          onEndReached={() => messages.hasNextPage && !messages.isFetchingNextPage && messages.fetchNextPage()}
          ListFooterComponent={messages.isFetchingNextPage || messages.isPending ? <ActivityIndicator style={styles.more} color={colors.textTertiary} /> : null}
          ListEmptyComponent={
            messages.isPending ? null : messages.error ? (
              <ErrorState error={messages.error} onRetry={() => messages.refetch()} />
            ) : (
              <View style={styles.emptyWrap}>
                <EmptyState icon="message-circle" title="Suhbatni boshlang" description={room.kind === 'project' ? 'Loyiha bo‘yicha savol, fikr va fayllar shu yerda.' : undefined} />
              </View>
            )
          }
          renderItem={({ item, index }) => {
            const older = list[index + 1];
            const newer = list[index - 1];
            const dayBreak = !older || agencyDateKey(older.created_at) !== agencyDateKey(item.created_at);
            const startsGroup =
              dayBreak || !older || older.sender_id !== item.sender_id || older.is_system || new Date(item.created_at).getTime() - new Date(older.created_at).getTime() > GROUP_GAP_MS;
            const endsGroup = !newer || newer.sender_id !== item.sender_id || newer.is_system || new Date(newer.created_at).getTime() - new Date(item.created_at).getTime() > GROUP_GAP_MS;
            return (
              <View>
                {dayBreak ? <DaySeparator date={item.created_at} /> : null}
                <MessageBubble
                  m={item}
                  mine={item.sender_id === me.userId}
                  showName={showNames && startsGroup}
                  showAvatar={showNames && endsGroup}
                  reply={item.reply_to_id ? (byId.get(item.reply_to_id) ?? null) : null}
                  onLongPress={() => openActions(item)}
                />
              </View>
            );
          }}
        />

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.md), borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {archived ? (
            <Text variant="caption" tone="tertiary" align="center">
              Chat arxivlangan — yangi xabar yozib bo‘lmaydi.
            </Text>
          ) : (
            <>
              {replyTo || editing ? (
                <View style={[styles.quoteBar, { backgroundColor: colors.surfaceSunken }]}>
                  <Icon name={editing ? 'edit-2' : 'corner-up-left'} size={14} color={colors.textSecondary} />
                  <View style={styles.flex}>
                    <Text variant="captionMedium" numberOfLines={1}>
                      {editing ? 'Tahrirlash' : `Javob: ${replyTo!.sender?.full_name ?? ''}`}
                    </Text>
                    <Text variant="caption" tone="secondary" numberOfLines={1}>
                      {(editing ?? replyTo)!.body || '📎 Fayl'}
                    </Text>
                  </View>
                  <IconButton
                    icon="x"
                    label="Bekor qilish"
                    variant="plain"
                    size={30}
                    onPress={() => {
                      if (editing) setText('');
                      setEditing(null);
                      setReplyTo(null);
                    }}
                  />
                </View>
              ) : null}
              {pending.length ? (
                <View style={styles.pendingList}>
                  {pending.map((p) => (
                    <View key={p.key} style={[styles.pendingChip, { backgroundColor: colors.surface, borderColor: p.error ? colors.danger : colors.border }]}>
                      <Icon name={p.error ? 'alert-triangle' : mimeIcon(p.mime)} size={14} color={p.error ? colors.danger : colors.text} />
                      <View style={styles.flex}>
                        <Text variant="caption" numberOfLines={1}>
                          {p.name}
                        </Text>
                        {!p.fileId && !p.error ? <ProgressBar value={p.size ? p.sent / p.size : 0} height={3} /> : null}
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Faylni olib tashlash"
                        hitSlop={10}
                        onPress={() => {
                          p.handle?.cancel();
                          setPending((all) => all.filter((x) => x.key !== p.key));
                        }}
                      >
                        <Icon name="x" size={14} color={colors.textSecondary} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <View style={styles.inputRow}>
                {editing ? null : <IconButton icon="paperclip" label="Fayl biriktirish" variant="plain" size={40} onPress={attach} />}
                <TextInput
                  value={text}
                  onChangeText={onChangeText}
                  placeholder="Xabar yozing…"
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  maxLength={4000}
                  style={[styles.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
                  accessibilityLabel="Xabar matni"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={editing ? 'Saqlash' : 'Yuborish'}
                  accessibilityState={{ disabled: !canSend || send.isPending }}
                  disabled={!canSend || send.isPending}
                  onPress={() => send.mutate()}
                  style={[styles.send, { backgroundColor: canSend ? colors.brand : colors.surfaceSunken }]}
                >
                  {send.isPending ? (
                    <ActivityIndicator color={colors.onBrand} size="small" />
                  ) : (
                    <Icon name={editing ? 'check' : 'arrow-up'} size={20} color={canSend ? colors.onBrand : colors.textTertiary} />
                  )}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
      <RoomInfoSheet room={room} visible={info} onClose={() => setInfo(false)} />
    </View>
  );
}

function DaySeparator({ date }: { date: string }) {
  const { colors } = useTheme();
  const key = agencyDateKey(date);
  const today = agencyDateKey(new Date());
  const label = key === today ? 'Bugun' : formatDateKey(key, key.slice(0, 4) !== today.slice(0, 4));
  return (
    <View style={styles.day}>
      <View style={[styles.dayPill, { backgroundColor: colors.surfaceSunken }]}>
        <Text variant="micro" tone="secondary">
          {label}
        </Text>
      </View>
    </View>
  );
}

function MessageBubble({
  m,
  mine,
  showName,
  showAvatar,
  reply,
  onLongPress,
}: {
  m: ChatMessage;
  mine: boolean;
  showName: boolean;
  showAvatar: boolean;
  reply: ChatMessage | null;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  const nav = useNav();
  if (m.is_system) {
    return (
      <Text variant="caption" tone="tertiary" align="center" style={styles.system}>
        {m.body}
      </Text>
    );
  }
  const deleted = !!m.deleted_at;
  const files = deleted ? [] : m.attachments.map((a) => a.file).filter((f): f is NonNullable<typeof f> => !!f);
  const images = files.filter((f) => f.kind === 'image');
  const others = files.filter((f) => f.kind !== 'image');
  const bubbleBg = mine ? colors.hero : colors.surface;
  const textColor = mine ? colors.heroText : colors.text;
  const metaColor = mine ? colors.heroTextSecondary : colors.textTertiary;

  return (
    <View style={[styles.msgRow, mine ? styles.msgMine : styles.msgTheirs]}>
      {!mine && showAvatar !== undefined ? (
        <View style={styles.avatarSlot}>{showAvatar && !mine ? <Avatar name={m.sender?.full_name} url={m.sender?.avatar_url} size={28} /> : null}</View>
      ) : null}
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={300}
        accessibilityHint="Uzoq bosib turing — javob berish, tahrirlash yoki o‘chirish"
        style={[styles.bubble, { backgroundColor: bubbleBg, borderColor: mine ? bubbleBg : colors.border }, mine ? styles.bubbleMine : styles.bubbleTheirs]}
      >
        {showName && !mine ? (
          <Text variant="captionMedium" tone="accent" numberOfLines={1}>
            {m.sender?.full_name ?? 'SUN MEDIA'}
          </Text>
        ) : null}
        {reply && !deleted ? (
          <View style={[styles.reply, { borderLeftColor: colors.brand, backgroundColor: mine ? 'rgba(255,255,255,0.08)' : colors.surfaceSunken }]}>
            <Text variant="captionMedium" numberOfLines={1} style={{ color: textColor }}>
              {reply.sender?.full_name ?? ''}
            </Text>
            <Text variant="caption" numberOfLines={2} style={{ color: metaColor }}>
              {reply.deleted_at ? 'Xabar o‘chirilgan' : reply.body || '📎 Fayl'}
            </Text>
          </View>
        ) : null}
        {images.length ? (
          <View style={styles.images}>
            {images.map((f) => (
              <ChatImage key={f.id} file={f} single={images.length === 1} onPress={() => nav.file(f.id)} />
            ))}
          </View>
        ) : null}
        {others.map((f) => (
          <Pressable key={f.id} accessibilityRole="button" onPress={() => nav.file(f.id)} style={[styles.fileChip, { backgroundColor: mine ? 'rgba(255,255,255,0.08)' : colors.surfaceSunken }]}>
            <Icon name={mimeIcon(f.mime_type)} size={18} color={textColor} />
            <View style={styles.flex}>
              <Text variant="captionMedium" numberOfLines={1} style={{ color: textColor }}>
                {f.name}
              </Text>
              <Text variant="micro" style={{ color: metaColor }}>
                {formatBytes(f.size_bytes)}
              </Text>
            </View>
          </Pressable>
        ))}
        {deleted ? (
          <Text variant="body" style={{ color: metaColor, fontStyle: 'italic' }}>
            Xabar o‘chirildi
          </Text>
        ) : m.body ? (
          <Text variant="body" style={{ color: textColor }}>
            {m.body}
          </Text>
        ) : null}
        <Text variant="micro" style={[styles.time, { color: metaColor }]}>
          {m.edited_at && !deleted ? 'tahrirlandi · ' : ''}
          {formatTime(m.created_at)}
        </Text>
      </Pressable>
    </View>
  );
}

function ChatImage({ file, single, onPress }: { file: NonNullable<ChatMessage['attachments'][number]['file']>; single: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const url = useSignedUrl(file);
  const ratio = file.width && file.height ? file.width / file.height : 1;
  const style = single ? { width: 220, height: Math.min(280, 220 / ratio) } : { width: 106, height: 106 };
  return (
    <Pressable accessibilityRole="imagebutton" accessibilityLabel={file.name} onPress={onPress}>
      {url.data ? (
        <Image source={{ uri: url.data }} style={[style, styles.image, { backgroundColor: colors.surfaceSunken }]} contentFit="cover" transition={120} />
      ) : (
        <View style={[style, styles.image, { backgroundColor: colors.surfaceSunken }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { padding: spacing.xl },
  flex: { flex: 1 },
  headerTitle: { alignItems: 'center', maxWidth: 240 },
  messages: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 3 },
  more: { marginVertical: spacing.lg },
  emptyWrap: { transform: [{ scaleY: -1 }], paddingTop: spacing.huge },
  day: { alignItems: 'center', marginVertical: spacing.md },
  dayPill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  system: { marginVertical: spacing.sm, paddingHorizontal: spacing.xl },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs + 2 },
  msgMine: { justifyContent: 'flex-end', paddingLeft: 56 },
  msgTheirs: { justifyContent: 'flex-start', paddingRight: 40 },
  avatarSlot: { width: 28 },
  bubble: { maxWidth: '100%', borderRadius: 18, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 4, borderWidth: StyleSheet.hairlineWidth, flexShrink: 1 },
  bubbleMine: { borderBottomRightRadius: 6 },
  bubbleTheirs: { borderBottomLeftRadius: 6 },
  reply: { borderLeftWidth: 3, borderRadius: 6, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  image: { borderRadius: 12 },
  fileChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: 12, minWidth: 180 },
  time: { alignSelf: 'flex-end', marginTop: -2 },
  composer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  quoteBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.md, borderRadius: radius.md },
  pendingList: { gap: spacing.xs },
  pendingChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  input: { flex: 1, minHeight: 40, maxHeight: 120, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: 10, paddingBottom: 10, fontSize: 15, fontFamily: 'Inter_400Regular' },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
