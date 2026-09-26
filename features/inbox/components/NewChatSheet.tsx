import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Icon, SearchField, SegmentedControl, Sheet, Text, TextField, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { fetchTeamDirectory } from '@/features/team/api';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { createGroupChat, openDirectChat } from '../api';

/** Staff start a private conversation with a colleague or a group chat. */
export function NewChatSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const me = useMe();
  const nav = useNav();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const team = useQuery({ queryKey: ['team', 'directory'], queryFn: fetchTeamDirectory, enabled: visible });

  const people = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (team.data ?? [])
      .filter((m) => m.user_id !== me.userId)
      .filter((m) => !term || m.full_name.toLowerCase().includes(term) || (m.job_title ?? '').toLowerCase().includes(term));
  }, [team.data, search, me.userId]);

  const reset = () => {
    setSearch('');
    setName('');
    setPicked([]);
    setMode('direct');
  };
  const opened = (roomId: string) => {
    queryClient.invalidateQueries({ queryKey: ['chat'] });
    reset();
    onClose();
    nav.chat(roomId);
  };

  const direct = useMutation({ mutationFn: (userId: string) => openDirectChat(userId), onSuccess: opened, onError: toast.error });
  const group = useMutation({ mutationFn: () => createGroupChat(name, picked), onSuccess: opened, onError: toast.error });
  const canCreateGroup = !!name.trim() && picked.length > 0;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={mode === 'direct' ? 'Yangi chat' : 'Yangi guruh'}
      actionLabel={mode === 'group' ? 'Yaratish' : undefined}
      actionDisabled={!canCreateGroup || group.isPending}
      onAction={mode === 'group' ? () => group.mutate() : undefined}
    >
      <SegmentedControl
        options={[
          { value: 'direct', label: 'Shaxsiy' },
          { value: 'group', label: 'Guruh' },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'group' ? <TextField label="Guruh nomi" value={name} onChangeText={setName} maxLength={120} placeholder="Masalan: SAFI syomka jamoasi" /> : null}
      <SearchField value={search} onChangeText={setSearch} placeholder="Ism yoki lavozim" />
      <Card padded={false}>
        {people.map((m, i) => {
          const selected = picked.includes(m.user_id);
          return (
            <Pressable
              key={m.user_id}
              accessibilityRole={mode === 'group' ? 'checkbox' : 'button'}
              accessibilityState={mode === 'group' ? { checked: selected } : undefined}
              disabled={direct.isPending}
              onPress={() =>
                mode === 'direct' ? direct.mutate(m.user_id) : setPicked(selected ? picked.filter((id) => id !== m.user_id) : [...picked, m.user_id])
              }
              style={({ pressed }) => [styles.person, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, pressed && { backgroundColor: colors.surfaceSunken }]}
            >
              <Avatar name={m.full_name} url={m.avatar_url} size={38} />
              <View style={styles.flex}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {m.full_name}
                </Text>
                {m.job_title ? (
                  <Text variant="caption" tone="secondary" numberOfLines={1}>
                    {m.job_title}
                  </Text>
                ) : null}
              </View>
              {mode === 'group' ? (
                <Icon name={selected ? 'check-circle' : 'circle'} size={22} color={selected ? colors.success : colors.textTertiary} />
              ) : (
                <Icon name="message-circle" size={18} color={colors.textTertiary} />
              )}
            </Pressable>
          );
        })}
        {team.isPending ? (
          <Text variant="caption" tone="tertiary" style={styles.pad}>
            Yuklanmoqda…
          </Text>
        ) : people.length === 0 ? (
          <Text variant="caption" tone="tertiary" style={styles.pad}>
            Hech kim topilmadi
          </Text>
        ) : null}
      </Card>
      {mode === 'group' ? (
        <Button
          title={picked.length ? `Guruh yaratish · ${picked.length + 1} kishi` : 'A’zolarni tanlang'}
          icon="users"
          loading={group.isPending}
          disabled={!canCreateGroup}
          onPress={() => group.mutate()}
        />
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: spacing.lg },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
});
