import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, EmptyState, Icon, ItemRow, QueryView, Screen, SearchField, Section, Sheet, SkeletonCards, Text, TextField, ToggleRow, useToast } from '@/components/ui';
import { FOLDER_KIND } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { formatAgo } from '@/lib/time';
import { formatBytes } from '@/lib/upload';
import { createFolder, fetchClient, fetchClientFolders, fetchFilesOverview, type FolderSummary } from './api';

/** Files home: staff pick a client; a client with one brand lands straight in its folders. */
export function FilesScreen() {
  const me = useMe();
  if (me.kind !== 'staff' && me.clients.length === 1) return <ClientFolders clientId={me.clients[0].id} />;
  return <FilesOverview />;
}

function FilesOverview() {
  const nav = useNav();
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['files', 'overview'], queryFn: fetchFilesOverview });
  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter((c) => !term || c.name.toLowerCase().includes(term) || c.code.toLowerCase().includes(term));
  }, [query.data, search]);
  const total = (query.data ?? []).reduce((sum, c) => sum + Number(c.total_bytes), 0);

  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: 'Fayllar' }} />
      <SearchField value={search} onChangeText={setSearch} placeholder="Mijoz nomi yoki kodi" />
      <QueryView query={query} skeleton={<SkeletonCards count={4} />} isEmpty={(d) => d.length === 0} empty={{ icon: 'folder', title: 'Mijoz yo‘q', description: 'Mijoz qo‘shilganda uning papkalari avtomatik yaratiladi.' }}>
        {() => (
          <>
            <Text variant="caption" tone="tertiary">
              {`${query.data!.length} mijoz · jami ${formatBytes(total) || '0 B'}`}
            </Text>
            <Card padded={false}>
              {list.map((c, i) => (
                <ItemRow
                  key={c.client_id}
                  first={i === 0}
                  leading={<Avatar name={c.code} url={c.logo_url} size={40} />}
                  title={c.name}
                  subtitle={[`${c.file_count} fayl`, Number(c.total_bytes) ? formatBytes(Number(c.total_bytes)) : null, c.last_upload_at ? `oxirgi: ${formatAgo(c.last_upload_at)}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                  onPress={() => nav.clientFiles(c.client_id)}
                />
              ))}
            </Card>
            {list.length === 0 ? <EmptyState icon="search" title="Topilmadi" /> : null}
          </>
        )}
      </QueryView>
    </Screen>
  );
}

export function ClientFilesScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  return <ClientFolders clientId={clientId} />;
}

function ClientFolders({ clientId }: { clientId: string }) {
  const { can, appInterface } = useAuth();
  const nav = useNav();
  const isClient = appInterface === 'client';
  const client = useQuery({ queryKey: ['clients', 'basic', clientId], queryFn: () => fetchClient(clientId) });
  const folders = useQuery({ queryKey: ['files', 'folders', clientId], queryFn: () => fetchClientFolders(clientId) });
  const [creating, setCreating] = useState(false);
  const system = (folders.data ?? []).filter((f) => f.is_system);
  const custom = (folders.data ?? []).filter((f) => !f.is_system);
  const canManage = !isClient && can('files.manage');

  return (
    <Screen edges={[]} refreshing={folders.isRefetching} onRefresh={() => folders.refetch()}>
      <Stack.Screen options={{ title: client.data?.name ?? 'Fayllar' }} />
      {isClient ? (
        <Text variant="body" tone="secondary">
          Brend fayllaringiz va tasdiqlangan kontent. Logotip, brendbuk, musiqa va rasmlarni o‘zingiz ham yuklashingiz mumkin.
        </Text>
      ) : null}
      <QueryView query={folders} skeleton={<SkeletonCards count={4} />} isEmpty={(d) => d.length === 0} empty={{ icon: 'folder', title: 'Papka yo‘q' }}>
        {() => (
          <>
            <View style={styles.grid}>
              {system.map((f) => (
                <FolderCard key={f.id} folder={f} showVisibility={!isClient} onPress={() => nav.folder(f.id)} />
              ))}
            </View>
            {custom.length || canManage ? (
              <Section title="Qo‘shimcha papkalar" actionLabel={canManage ? 'Yangi papka' : undefined} onAction={canManage ? () => setCreating(true) : undefined}>
                {custom.length ? (
                  <View style={styles.grid}>
                    {custom.map((f) => (
                      <FolderCard key={f.id} folder={f} showVisibility={!isClient} onPress={() => nav.folder(f.id)} />
                    ))}
                  </View>
                ) : (
                  <Text variant="caption" tone="tertiary">
                    Loyiha yoki kampaniya uchun alohida papka yarating.
                  </Text>
                )}
              </Section>
            ) : null}
          </>
        )}
      </QueryView>
      <NewFolderSheet clientId={clientId} visible={creating} onClose={() => setCreating(false)} />
    </Screen>
  );
}

function FolderCard({ folder, showVisibility, onPress }: { folder: FolderSummary; showVisibility: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const meta = FOLDER_KIND[folder.kind];
  const count = Number(folder.file_count);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${folder.name}, ${count} fayl`} onPress={onPress} style={({ pressed }) => [styles.cell, pressed && styles.pressed]}>
      <Card style={styles.folder}>
        <View style={styles.folderHead}>
          <View style={[styles.folderIcon, { backgroundColor: folder.kind === 'approved' ? colors.successSoft : colors.surfaceSunken }]}>
            <Icon name={meta.icon} size={18} color={folder.kind === 'approved' ? colors.success : colors.text} />
          </View>
          {showVisibility && folder.visibility === 'internal' ? <Icon name="lock" size={14} color={colors.textTertiary} /> : null}
        </View>
        <Text variant="bodyMedium" numberOfLines={1}>
          {folder.name}
        </Text>
        <Text variant="caption" tone="tertiary" numberOfLines={1}>
          {count ? `${count} fayl · ${formatBytes(Number(folder.total_bytes))}` : folder.is_system ? meta.hint : 'Bo‘sh'}
        </Text>
      </Card>
    </Pressable>
  );
}

function NewFolderSheet({ clientId, visible, onClose }: { clientId: string; visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [shared, setShared] = useState(false);
  const mutation = useMutation({
    mutationFn: () => createFolder(clientId, name, shared ? 'client' : 'internal'),
    onSuccess: () => {
      toast.show('Papka yaratildi');
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setName('');
      setShared(false);
      onClose();
    },
    onError: toast.error,
  });
  return (
    <Sheet visible={visible} onClose={onClose} title="Yangi papka" actionLabel="Yaratish" actionDisabled={!name.trim() || mutation.isPending} onAction={() => mutation.mutate()}>
      <TextField label="Papka nomi" value={name} onChangeText={setName} maxLength={120} autoFocus placeholder="Masalan: Navro‘z kampaniyasi" />
      <ToggleRow label="Mijozga ko‘rinadi" description="O‘chiq bo‘lsa, papka faqat jamoa uchun" value={shared} onChange={setShared} />
      {shared ? <Badge label="Mijoz bu papkadagi fayllarni ko‘radi" tone="warning" icon="eye" /> : null}
      <Button title="Yaratish" icon="folder-plus" loading={mutation.isPending} disabled={!name.trim()} onPress={() => mutation.mutate()} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  cell: { width: '50%', padding: spacing.xs },
  pressed: { opacity: 0.85 },
  folder: { gap: 4, minHeight: 112 },
  folderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.xs },
  folderIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
