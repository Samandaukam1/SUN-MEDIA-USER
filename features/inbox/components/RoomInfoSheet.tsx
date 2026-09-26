import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Sheet, Text, ToggleRow, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { leaveRoom, setRoomMuted, type RoomDetail } from '../api';

// "Muted" without an end date: far enough that it never lapses by itself.
const MUTE_FOREVER = '2999-01-01T00:00:00Z';

export function RoomInfoSheet({ room, visible, onClose }: { room: RoomDetail; visible: boolean; onClose: () => void }) {
  const me = useMe();
  const nav = useNav();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const mine = room.members.find((m) => m.user_id === me.userId);
  const muted = !!mine?.muted_until && new Date(mine.muted_until).getTime() > Date.now();
  const canLeave = room.kind === 'internal' && !room.is_default;
  const refresh = () => ['chat', 'notifications'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

  const mute = useMutation({
    mutationFn: (on: boolean) => setRoomMuted(room.id, me.userId, on ? MUTE_FOREVER : null),
    onSuccess: (_, on) => {
      toast.show(on ? 'Bildirishnomalar o‘chirildi' : 'Bildirishnomalar yoqildi');
      refresh();
    },
    onError: toast.error,
  });
  const leave = useMutation({
    mutationFn: () => leaveRoom(room.id, me.userId),
    onSuccess: () => {
      toast.show('Guruhdan chiqdingiz');
      refresh();
      onClose();
      nav.back();
    },
    onError: toast.error,
  });

  const members = [...room.members].sort((a, b) => Number(b.is_admin) - Number(a.is_admin) || (a.person?.full_name ?? '').localeCompare(b.person?.full_name ?? ''));

  return (
    <Sheet visible={visible} onClose={onClose} title="Chat ma’lumotlari">
      {room.description ? (
        <Text variant="body" tone="secondary">
          {room.description}
        </Text>
      ) : null}
      <ToggleRow label="Ovozsiz" description="Bu chatdan push va bildirishnoma kelmaydi" value={muted} onChange={(v) => mute.mutate(v)} disabled={mute.isPending} />
      <Text variant="label" tone="tertiary">
        {`A’zolar · ${room.members.length}`}
      </Text>
      <Card padded={false}>
        {members.map((m, i) => (
          <View key={m.user_id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <Avatar name={m.person?.full_name} url={m.person?.avatar_url} size={34} />
            <Text variant="bodyMedium" numberOfLines={1} style={styles.flex}>
              {m.person?.full_name ?? '—'}
              {m.user_id === me.userId ? ' (siz)' : ''}
            </Text>
            {m.is_admin ? <Badge label="Admin" /> : null}
          </View>
        ))}
      </Card>
      {canLeave ? (
        <Button
          title="Guruhdan chiqish"
          icon="log-out"
          variant="danger"
          loading={leave.isPending}
          onPress={() =>
            Alert.alert('Guruhdan chiqasizmi?', room.name, [
              { text: 'Bekor qilish', style: 'cancel' },
              { text: 'Chiqish', style: 'destructive', onPress: () => leave.mutate() },
            ])
          }
        />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
