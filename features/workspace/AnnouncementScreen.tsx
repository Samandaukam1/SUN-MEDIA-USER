import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, QueryView, Screen, Text, useToast } from '@/components/ui';
import { ROLE_LABEL } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useNav } from '@/lib/routes';
import { formatShortDateTime } from '@/lib/time';
import { archiveAnnouncement, fetchAnnouncement, markAnnouncementRead } from './api';

export function AnnouncementScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { can } = useAuth();
  const nav = useNav();
  const toast = useToast();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['workspace', 'announcement', id], queryFn: () => fetchAnnouncement(id, me.userId), enabled: !!id });

  const read = useMutation({
    mutationFn: () => markAnnouncementRead(id, me.userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace', 'announcements'] }),
  });
  const archive = useMutation({
    mutationFn: () => archiveAnnouncement(id),
    onSuccess: () => {
      toast.show('E’lon olib tashlandi');
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      nav.back();
    },
    onError: toast.error,
  });

  const unread = query.data && !query.data.read;
  useEffect(() => {
    if (unread && !read.isPending && !read.isSuccess) read.mutate();
  }, [unread, read]);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'E’lon' }} />
      <QueryView query={query}>
        {(a) => (
          <>
            <View style={styles.head}>
              {a.is_pinned ? <Badge label="Mahkamlangan" icon="bookmark" tone="accent" /> : null}
              <Text variant="title">{a.title}</Text>
              <View style={styles.author}>
                <Avatar name={a.author?.full_name} url={a.author?.avatar_url} size={28} />
                <Text variant="caption" tone="secondary">
                  {a.author?.full_name ?? 'SUN MEDIA'} · {formatShortDateTime(a.published_at)}
                </Text>
              </View>
            </View>
            <Text variant="body" style={styles.body} selectable>
              {a.body}
            </Text>
            {a.audience_roles?.length ? (
              <Text variant="caption" tone="tertiary">
                Kimlar uchun: {a.audience_roles.map((r) => ROLE_LABEL[r] ?? r).join(', ')}
              </Text>
            ) : null}
            {can('workspace.manage') ? (
              <Button
                title="E’lonni olib tashlash"
                icon="trash-2"
                variant="danger"
                loading={archive.isPending}
                onPress={() =>
                  Alert.alert('E’lonni olib tashlash', 'E’lon barcha xodimlar uchun yo‘qoladi.', [
                    { text: 'Bekor qilish', style: 'cancel' },
                    { text: 'Olib tashlash', style: 'destructive', onPress: () => archive.mutate() },
                  ])
                }
              />
            ) : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.md },
  author: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { lineHeight: 24 },
});
