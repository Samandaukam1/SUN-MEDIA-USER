import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Card, EmptyState, Icon, ProgressBar, QueryView, Screen, Text, TextArea, ToggleRow, useToast } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchContent } from '@/features/studio/api';
import { useTheme } from '@/hooks/useTheme';
import { useInterfaceBase } from '@/lib/routes';
import { formatTimecode } from '@/lib/timecode';
import { formatBytes, guessMimeType, startUpload, UploadCancelled, type UploadHandle, type UploadSource } from '@/lib/upload';
import { fetchEditedFolderId, submitVersion } from './api';

const CLOSED = ['approved', 'scheduled', 'published', 'cancelled'];

/**
 * Editor / designer uploads the next cut. Large files go up in resumable chunks with progress and
 * cancel; the version then enters internal review (or goes straight to the client for managers).
 */
export function SubmitVersionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['content', 'detail', id], queryFn: () => fetchContent(id), enabled: !!id });
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Yangi versiya' }} />
      <QueryView query={query}>
        {(c) =>
          CLOSED.includes(c.status) ? (
            <EmptyState icon="lock" title="Kontent yopilgan" description="Tasdiqlangan yoki bekor qilingan kontentga yangi versiya yuklanmaydi." />
          ) : (
            <SubmitForm content={c} />
          )
        }
      </QueryView>
    </Screen>
  );
}

type Content = Awaited<ReturnType<typeof fetchContent>>;

function SubmitForm({ content }: { content: Content }) {
  const { can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const base = useInterfaceBase();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [source, setSource] = useState<UploadSource | null>(null);
  const [notes, setNotes] = useState('');
  const [toClient, setToClient] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'submitting'>('idle');
  const handle = useRef<UploadHandle | null>(null);
  const nextNumber = Math.max(0, ...content.versions.map((v) => v.version_number)) + 1;
  const openRevision = content.revisions.find((r) => r.status === 'open' || r.status === 'in_progress');

  // Leaving the screen stops an unfinished upload instead of leaking it in the background.
  useEffect(() => () => handle.current?.cancel(), []);

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos', 'images'], quality: 1, allowsMultipleSelection: false });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    const name = asset.fileName ?? `${content.client?.code ?? 'SM'}-${content.number}-v${nextNumber}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
    setSource({
      uri: asset.uri,
      name,
      mimeType: guessMimeType(name, asset.mimeType),
      size: asset.fileSize ?? 0,
      durationMs: asset.duration ?? null,
      width: asset.width || null,
      height: asset.height || null,
    });
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['video/*', 'image/*', 'application/pdf'], copyToCacheDirectory: true, multiple: false });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setSource({ uri: asset.uri, name: asset.name, mimeType: guessMimeType(asset.name, asset.mimeType), size: asset.size ?? 0 });
  };

  const upload = async () => {
    if (!source) return;
    if (!source.size) {
      Alert.alert('Fayl hajmi aniqlanmadi', 'Faylni “Fayllar” orqali qayta tanlab ko‘ring.');
      return;
    }
    setPhase('uploading');
    setProgress({ sent: 0, total: source.size });
    try {
      const folderId = await fetchEditedFolderId(content.client_id);
      handle.current = startUpload(source, { clientId: content.client_id, folderId, contentId: content.id }, (sent, total) => setProgress({ sent, total }));
      const file = await handle.current.promise;
      handle.current = null;
      setPhase('submitting');
      const version = await submitVersion(content.id, file.id, notes, toClient);
      ['approvals', 'content', 'files', 'home', 'dashboard'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      toast.show(toClient ? `v${version.version_number} mijozga yuborildi` : `v${version.version_number} ichki tekshiruvga yuborildi`);
      router.replace(`${base}/approvals/${version.id}` as Href);
    } catch (e) {
      handle.current = null;
      setPhase('idle');
      setProgress(null);
      if (!(e instanceof UploadCancelled)) toast.error(e);
    }
  };

  const busy = phase !== 'idle';
  const pct = progress && progress.total ? progress.sent / progress.total : 0;

  return (
    <>
      <Card style={styles.gap}>
        <Text variant="micro" tone="tertiary">
          {[content.client?.name, `Versiya ${nextNumber}`].filter(Boolean).join(' · ').toUpperCase()}
        </Text>
        <Text variant="heading">{content.title}</Text>
        {openRevision ? (
          <View style={[styles.revision, { backgroundColor: colors.dangerSoft }]}>
            <Icon name="rotate-ccw" size={16} color={colors.danger} />
            <Text variant="caption" style={styles.flex}>
              Revision #{openRevision.revision_number}: {openRevision.summary ?? 'izohlarni ko‘rib chiqing'}. Yangi versiya uni yopadi.
            </Text>
          </View>
        ) : null}
      </Card>

      {source ? (
        <Card style={styles.gap}>
          <View style={styles.fileRow}>
            <View style={[styles.fileIcon, { backgroundColor: colors.surfaceSunken }]}>
              <Icon name={source.mimeType.startsWith('video/') ? 'film' : source.mimeType.startsWith('image/') ? 'image' : 'file-text'} size={22} color={colors.text} />
            </View>
            <View style={styles.flex}>
              <Text variant="bodyMedium" numberOfLines={2}>
                {source.name}
              </Text>
              <Text variant="caption" tone="secondary">
                {[formatBytes(source.size), source.durationMs ? formatTimecode(source.durationMs) : null, source.width && source.height ? `${source.width}×${source.height}` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          </View>
          {progress ? (
            <View style={styles.gap}>
              <ProgressBar value={pct} label="Yuklash jarayoni" />
              <Text variant="caption" tone="secondary">
                {phase === 'submitting' ? 'Versiya yaratilmoqda…' : `${Math.round(pct * 100)}% · ${formatBytes(progress.sent)} / ${formatBytes(progress.total)}`}
              </Text>
            </View>
          ) : (
            <Button title="Boshqa fayl tanlash" icon="repeat" variant="ghost" size="md" fullWidth={false} onPress={pickMedia} />
          )}
        </Card>
      ) : (
        <View style={styles.pickers}>
          <Button title="Galereyadan video yoki rasm" icon="film" variant="secondary" onPress={pickMedia} />
          <Button title="Fayllardan tanlash" icon="folder" variant="secondary" onPress={pickFile} />
        </View>
      )}

      <TextArea label="Nima o‘zgardi?" value={notes} onChangeText={setNotes} maxLength={2000} minHeight={90} editable={!busy} placeholder="Masalan: musiqa almashtirildi, logo kattalashtirildi" />
      {can('approvals.manage') ? (
        <ToggleRow
          label="To‘g‘ridan-to‘g‘ri mijozga yuborish"
          description="Ichki tekshiruvni o‘tkazib yuboradi"
          value={toClient}
          onChange={setToClient}
          disabled={busy}
        />
      ) : null}

      {phase === 'uploading' ? (
        <Button title="Bekor qilish" icon="x" variant="danger" onPress={() => handle.current?.cancel()} />
      ) : (
        <Button title={toClient ? 'Yuklash va mijozga yuborish' : 'Yuklash va tekshiruvga yuborish'} icon="upload" disabled={!source} loading={phase === 'submitting'} onPress={upload} />
      )}
      <Text variant="caption" tone="tertiary">
        Katta videolar bo‘laklab yuklanadi: internet uzilsa, yuklash o‘zi davom etadi. Yuklash tugaguncha ekranni yopmang.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  flex: { flex: 1 },
  pickers: { gap: spacing.md },
  revision: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: spacing.md, borderRadius: radius.md },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fileIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
