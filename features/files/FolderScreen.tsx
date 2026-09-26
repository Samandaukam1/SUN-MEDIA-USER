import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Badge, Button, Chip, ChipRow, EmptyState, ErrorState, Fab, HeaderButton, Icon, SearchField, Sheet, SkeletonCards, Text, TextField, useToast, PullRefreshControl } from '@/components/ui';
import { FOLDER_KIND } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { useSignedUrl } from '@/lib/storage';
import { formatShortDateTime } from '@/lib/time';
import { formatTimecode } from '@/lib/timecode';
import { formatBytes } from '@/lib/upload';
import { uploads, useUploads } from '@/lib/uploadQueue';
import { deleteFolder, FILE_PAGE, fetchFolder, fetchFolderFiles, registerLink, renameFolder, type FileRow, type FileSort, type FolderDetail } from './api';
import { useFileActions } from './components/FileActions';
import { mimeIcon, UploadList } from './components/UploadList';
import { chooseSource, pickDocuments, pickMedia } from './pick';

const SORTS: { value: FileSort; label: string }[] = [
  { value: 'newest', label: 'Yangi' },
  { value: 'name', label: 'Nomi' },
  { value: 'size', label: 'Hajmi' },
];

export function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const folder = useQuery({ queryKey: ['files', 'folder', id], queryFn: () => fetchFolder(id), enabled: !!id });
  const { colors } = useTheme();
  if (folder.data) return <FolderBody folder={folder.data} />;
  return (
    <View style={[styles.fill, styles.pad, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Papka' }} />
      {folder.isPending ? (
        <SkeletonCards count={4} />
      ) : folder.error ? (
        <ErrorState error={folder.error} onRetry={() => folder.refetch()} />
      ) : (
        <EmptyState icon="folder" title="Papka topilmadi" description="U o‘chirilgan yoki sizga ko‘rinmaydi." />
      )}
    </View>
  );
}

function FolderBody({ folder }: { folder: FolderDetail }) {
  const { can, appInterface, context } = useAuth();
  const nav = useNav();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<FileSort>('newest');
  const [linking, setLinking] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const actions = useFileActions();
  const isClient = appInterface === 'client';
  const meta = FOLDER_KIND[folder.kind];

  const clientCanUpload =
    isClient &&
    folder.visibility === 'client' &&
    !['approved', 'contracts'].includes(folder.kind) &&
    !!context?.clients.find((c) => c.id === folder.client_id)?.permissions.includes('client.files.upload');
  const canUpload = isClient ? clientCanUpload : can('files.upload');
  const canManage = !isClient && can('files.manage');

  const query = useInfiniteQuery({
    queryKey: ['files', 'list', folder.id, search, sort],
    queryFn: ({ pageParam }) => fetchFolderFiles(folder.id, search, sort, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (last.length === FILE_PAGE ? all.length : undefined),
  });
  const files = query.data?.pages.flat() ?? [];
  const jobs = useUploads((t) => t.folderId === folder.id);

  const upload = async () => {
    const kind = isClient || !canManage ? await chooseSource() : await chooseWithLink();
    if (kind === 'link') {
      setLinking(true);
      return;
    }
    const picked = kind === 'media' ? await pickMedia() : kind === 'files' ? await pickDocuments() : [];
    const empty = picked.filter((p) => !p.size);
    picked.filter((p) => p.size).forEach((source) => uploads.enqueue(source, { clientId: folder.client_id, folderId: folder.id }));
    if (empty.length) toast.show(`${empty.length} ta faylning hajmi aniqlanmadi — “Fayllar” orqali tanlang`, 'error');
  };

  const removeFolder = useMutation({
    mutationFn: () => deleteFolder(folder.id),
    onSuccess: () => {
      toast.show('Papka o‘chirildi');
      queryClient.invalidateQueries({ queryKey: ['files'] });
      nav.back();
    },
    onError: toast.error,
  });

  const folderMenu = () => {
    const options = ['Nomini o‘zgartirish', 'Papkani o‘chirish', 'Bekor qilish'];
    const run = (i: number) => {
      if (i === 0) setRenaming(true);
      if (i === 1) {
        if (files.length) {
          Alert.alert('Papka bo‘sh emas', 'Avval fayllarni boshqa papkaga ko‘chiring yoki o‘chiring.');
          return;
        }
        Alert.alert('Papkani o‘chirasizmi?', folder.name, [
          { text: 'Bekor qilish', style: 'cancel' },
          { text: 'O‘chirish', style: 'destructive', onPress: () => removeFolder.mutate() },
        ]);
      }
    };
    if (Platform.OS === 'ios') ActionSheetIOS.showActionSheetWithOptions({ title: folder.name, options, cancelButtonIndex: 2, destructiveButtonIndex: 1 }, run);
    else Alert.alert(folder.name, undefined, [{ text: options[0], onPress: () => run(0) }, { text: options[1], onPress: () => run(1) }, { text: options[2], style: 'cancel' }]);
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: folder.name,
          headerRight: canManage && !folder.is_system ? () => <HeaderButton icon="more-horizontal" label="Papka amallari" onPress={folderMenu} /> : undefined,
        }}
      />
      <FlatList
        data={files}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onEndReachedThreshold={0.4}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        refreshControl={<PullRefreshControl busy={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => query.refetch()} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.meta}>
              <Icon name={meta.icon} size={16} color={colors.textSecondary} />
              <Text variant="caption" tone="secondary" style={styles.flex}>
                {[folder.client?.name, folder.is_system ? meta.hint : null].filter(Boolean).join(' · ')}
              </Text>
              {!isClient ? <Badge label={folder.visibility === 'client' ? 'Mijozga ko‘rinadi' : 'Faqat jamoa'} tone={folder.visibility === 'client' ? 'warning' : 'neutral'} icon={folder.visibility === 'client' ? 'eye' : 'lock'} /> : null}
            </View>
            <SearchField value={search} onChangeText={setSearch} placeholder="Fayl nomi" />
            <ChipRow>
              {SORTS.map((s) => (
                <Chip key={s.value} label={s.label} selected={sort === s.value} onPress={() => setSort(s.value)} />
              ))}
            </ChipRow>
            <UploadList jobs={jobs} />
          </View>
        }
        ListEmptyComponent={
          query.isPending ? (
            <SkeletonCards count={4} />
          ) : query.error ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : jobs.length ? null : (
            <EmptyState
              icon={meta.icon}
              title={search ? 'Topilmadi' : 'Papka bo‘sh'}
              description={canUpload && !search ? 'Pastdagi “Yuklash” tugmasi bilan rasm, video yoki hujjat qo‘shing.' : undefined}
            />
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.more} color={colors.textTertiary} /> : null}
        renderItem={({ item, index }) => (
          <FileItem file={item} first={index === 0} last={index === files.length - 1} showVisibility={!isClient && folder.visibility === 'client'} onPress={() => nav.file(item.id)} onLongPress={() => actions.open(item)} />
        )}
      />
      {canUpload ? <Fab icon="upload" label="Yuklash" onPress={upload} overHomeIndicator /> : null}
      {actions.element}
      <LinkSheet folder={folder} visible={linking} onClose={() => setLinking(false)} />
      <RenameFolderSheet folder={folder} visible={renaming} onClose={() => setRenaming(false)} />
    </View>
  );
}

function chooseWithLink(): Promise<'media' | 'files' | 'link' | null> {
  return new Promise((resolve) => {
    const options = ['Galereya (rasm va video)', 'Fayllar', 'Havola (Google Drive, Dropbox…)', 'Bekor qilish'];
    const map = ['media', 'files', 'link', null] as const;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title: 'Fayl qo‘shish', options, cancelButtonIndex: 3 }, (i) => resolve(map[i] ?? null));
      return;
    }
    Alert.alert('Fayl qo‘shish', undefined, [
      { text: options[0], onPress: () => resolve('media') },
      { text: options[1], onPress: () => resolve('files') },
      { text: options[2], onPress: () => resolve('link') },
      { text: options[3], style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

function FileItem({ file, first, last, showVisibility, onPress, onLongPress }: { file: FileRow; first: boolean; last: boolean; showVisibility: boolean; onPress: () => void; onLongPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Uzoq bosib turing — amallar"
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfaceSunken : colors.surface, borderColor: colors.border },
        first && styles.firstRow,
        last && styles.lastRow,
        !first && { borderTopWidth: 0 },
      ]}
    >
      <FileThumb file={file} />
      <View style={styles.flex}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {file.name}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {[
            file.external_url ? 'Havola' : formatBytes(file.size_bytes),
            file.duration_ms ? formatTimecode(file.duration_ms) : null,
            file.uploader?.full_name,
            formatShortDateTime(file.uploaded_at ?? file.created_at),
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      {showVisibility && file.visibility === 'internal' ? <Badge label="Ichki" icon="lock" /> : <Icon name="chevron-right" size={18} color={colors.textTertiary} />}
    </Pressable>
  );
}

export function FileThumb({ file, size = 44 }: { file: Pick<FileRow, 'kind' | 'mime_type' | 'bucket' | 'storage_path' | 'external_url'>; size?: number }) {
  const { colors } = useTheme();
  const isImage = file.kind === 'image' && !file.external_url;
  const url = useSignedUrl(isImage ? file : null);
  const box = { width: size, height: size, borderRadius: radius.md };
  if (isImage && url.data) return <Image source={{ uri: url.data }} style={[box, { backgroundColor: colors.surfaceSunken }]} contentFit="cover" transition={120} />;
  return (
    <View style={[box, styles.thumb, { backgroundColor: file.kind === 'video' ? colors.hero : colors.surfaceSunken }]}>
      <Icon name={file.external_url ? 'link' : mimeIcon(file.mime_type)} size={size * 0.42} color={file.kind === 'video' ? colors.brand : colors.text} />
    </View>
  );
}

function LinkSheet({ folder, visible, onClose }: { folder: FolderDetail; visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const valid = !!name.trim() && /^https:\/\/\S+$/.test(url.trim());
  const mutation = useMutation({
    mutationFn: () => registerLink(folder.client_id, folder.id, name, url),
    onSuccess: () => {
      toast.show('Havola qo‘shildi');
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setName('');
      setUrl('');
      onClose();
    },
    onError: toast.error,
  });
  return (
    <Sheet visible={visible} onClose={onClose} title="Havola qo‘shish" actionLabel="Qo‘shish" actionDisabled={!valid || mutation.isPending} onAction={() => mutation.mutate()}>
      <Text variant="caption" tone="secondary">
        Juda katta xom materiallar Google Drive yoki Dropbox’da bo‘lsa, havolasini shu papkaga qo‘shing.
      </Text>
      <TextField label="Nomi" value={name} onChangeText={setName} maxLength={255} placeholder="Masalan: 12-sentabr syomka, 4K" />
      <TextField label="Havola (https://…)" value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://drive.google.com/…" />
      <Button title="Qo‘shish" icon="link" loading={mutation.isPending} disabled={!valid} onPress={() => mutation.mutate()} />
    </Sheet>
  );
}

function RenameFolderSheet({ folder, visible, onClose }: { folder: FolderDetail; visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(folder.name);
  const mutation = useMutation({
    mutationFn: () => renameFolder(folder.id, name),
    onSuccess: () => {
      toast.show('Papka nomi o‘zgartirildi');
      queryClient.invalidateQueries({ queryKey: ['files'] });
      onClose();
    },
    onError: toast.error,
  });
  return (
    <Sheet visible={visible} onClose={onClose} title="Papka nomi" actionLabel="Saqlash" actionDisabled={!name.trim() || mutation.isPending} onAction={() => mutation.mutate()}>
      <TextField label="Nomi" value={name} onChangeText={setName} maxLength={120} autoFocus />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { padding: spacing.xl },
  flex: { flex: 1 },
  list: { padding: spacing.xl, paddingBottom: 140 },
  header: { gap: spacing.md, marginBottom: spacing.md },
  meta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  more: { marginVertical: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderWidth: StyleSheet.hairlineWidth },
  firstRow: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  lastRow: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  thumb: { alignItems: 'center', justifyContent: 'center' },
});
