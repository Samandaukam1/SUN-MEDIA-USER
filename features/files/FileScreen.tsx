import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, EmptyState, HeaderButton, KeyValue, QueryView, Screen, Skeleton, Text, useToast } from '@/components/ui';
import { CONTENT_TYPE } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { ReviewPlayer } from '@/features/approvals/components/ReviewPlayer';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { signedUrl, useSignedUrl } from '@/lib/storage';
import { formatShortDateTime } from '@/lib/time';
import { formatTimecode } from '@/lib/timecode';
import { formatBytes } from '@/lib/upload';
import { fetchFile, type FileDetail } from './api';
import { useFileActions } from './components/FileActions';
import { FileThumb } from './FolderScreen';

const KIND_LABEL: Record<string, string> = { video: 'Video', image: 'Rasm', audio: 'Audio', pdf: 'PDF', document: 'Hujjat', archive: 'Arxiv', other: 'Fayl' };

export function FileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['files', 'detail', id], queryFn: () => fetchFile(id), enabled: !!id });
  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <QueryView query={query} skeleton={<Skeleton height={280} rounded={radius.lg} />}>
        {(file) =>
          file && !file.deleted_at ? (
            <FileBody file={file} />
          ) : (
            <>
              <Stack.Screen options={{ title: 'Fayl' }} />
              <EmptyState icon="file" title="Fayl topilmadi" description="U o‘chirilgan yoki sizga ko‘rinmaydi." />
            </>
          )
        }
      </QueryView>
    </Screen>
  );
}

function FileBody({ file }: { file: FileDetail }) {
  const { appInterface } = useAuth();
  const nav = useNav();
  const toast = useToast();
  const { colors } = useTheme();
  const actions = useFileActions(() => nav.back());
  const playable = (file.kind === 'video' || file.kind === 'audio') && !file.external_url;
  const media = useSignedUrl(file.kind === 'image' || playable ? file : null);
  const isStaff = appInterface !== 'client';

  const openExternally = async () => {
    try {
      const url = await signedUrl(file);
      if (url) await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: file.name,
          headerRight: () => <HeaderButton icon="more-horizontal" label="Fayl amallari" onPress={() => actions.open(file)} />,
        }}
      />
      {file.kind === 'image' && !file.external_url ? (
        media.data ? (
          <Pressable accessibilityRole="imagebutton" accessibilityLabel="Rasmni to‘liq ochish" onPress={openExternally}>
            <Image source={{ uri: media.data }} style={[styles.image, { backgroundColor: colors.surfaceSunken }]} contentFit="contain" transition={150} />
          </Pressable>
        ) : (
          <Skeleton height={300} rounded={radius.lg} />
        )
      ) : playable ? (
        media.data ? (
          <ReviewPlayer url={media.data} durationMs={file.duration_ms} aspect={file.width && file.height ? file.width / file.height : file.kind === 'audio' ? 3 : null} markers={[]} />
        ) : (
          <Skeleton height={260} rounded={radius.lg} />
        )
      ) : (
        <Card style={styles.center}>
          <FileThumb file={file} size={72} />
          <Text variant="heading" align="center" numberOfLines={3}>
            {file.name}
          </Text>
          <Button title={file.external_url ? 'Havolani ochish' : 'Faylni ochish'} icon="external-link" onPress={openExternally} />
        </Card>
      )}

      <Card style={styles.info}>
        <View style={styles.badges}>
          <Badge label={KIND_LABEL[file.kind] ?? 'Fayl'} />
          {isStaff ? <Badge label={file.visibility === 'client' ? 'Mijozga ko‘rinadi' : 'Faqat jamoa'} tone={file.visibility === 'client' ? 'warning' : 'neutral'} icon={file.visibility === 'client' ? 'eye' : 'lock'} /> : null}
          {file.task_id ? <Badge label="Vazifa ilovasi" icon="paperclip" /> : null}
        </View>
        <KeyValue label="Nomi" value={file.name} />
        {!file.external_url ? <KeyValue label="Hajmi" value={formatBytes(file.size_bytes) || '—'} /> : null}
        {file.duration_ms ? <KeyValue label="Davomiyligi" value={formatTimecode(file.duration_ms)} /> : null}
        {file.width && file.height ? <KeyValue label="O‘lchami" value={`${file.width}×${file.height}`} /> : null}
        <KeyValue label="Yukladi" value={[file.uploader?.full_name, formatShortDateTime(file.uploaded_at ?? file.created_at)].filter(Boolean).join(' · ')} />
        {file.client ? <KeyValue label="Mijoz" value={file.client.name} /> : null}
        {file.folder ? <KeyValue label="Papka" value={file.folder.name} onPress={() => nav.folder(file.folder!.id)} /> : null}
        {file.content ? (
          <KeyValue label="Kontent" value={`${CONTENT_TYPE[file.content.content_type].label} #${file.content.number} · ${file.content.title}`} onPress={() => nav.content(file.content!.id)} />
        ) : null}
        {file.task_id ? <KeyValue label="Vazifa" value="Vazifani ochish" onPress={() => nav.task(file.task_id!)} /> : null}
      </Card>

      <View style={styles.row}>
        <Button title="Ochish" icon="external-link" variant="secondary" fullWidth={false} style={styles.flex} onPress={openExternally} />
        <Button title="Amallar" icon="more-horizontal" variant="secondary" fullWidth={false} style={styles.flex} onPress={() => actions.open(file)} />
      </View>
      {actions.element}
    </>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 360, borderRadius: radius.lg },
  center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  info: { gap: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
