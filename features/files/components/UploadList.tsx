import { StyleSheet, View } from 'react-native';

import { Card, Icon, IconButton, ProgressBar, Text, type IconName } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatBytes } from '@/lib/upload';
import { uploads, type UploadJob } from '@/lib/uploadQueue';

export function mimeIcon(mime: string | null | undefined): IconName {
  if (!mime) return 'file';
  if (mime.startsWith('video/')) return 'film';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'music';
  if (mime === 'application/pdf' || mime.startsWith('text/') || mime.includes('word') || mime.includes('sheet') || mime.includes('presentation')) return 'file-text';
  if (mime.includes('zip')) return 'archive';
  return 'file';
}

/** Files on their way up for this place (folder, task, content): progress, cancel, retry. */
export function UploadList({ jobs }: { jobs: UploadJob[] }) {
  const { colors } = useTheme();
  if (jobs.length === 0) return null;
  return (
    <Card padded={false}>
      {jobs.map((job, i) => {
        const pct = job.size ? job.sent / job.size : 0;
        return (
          <View key={job.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <View style={[styles.icon, { backgroundColor: colors.surfaceSunken }]}>
              <Icon name={job.status === 'done' ? 'check' : job.status === 'failed' ? 'alert-triangle' : mimeIcon(job.mimeType)} size={18} color={job.status === 'failed' ? colors.danger : job.status === 'done' ? colors.success : colors.text} />
            </View>
            <View style={styles.body}>
              <Text variant="bodyMedium" numberOfLines={1}>
                {job.name}
              </Text>
              {job.status === 'uploading' || job.status === 'queued' ? <ProgressBar value={pct} height={4} label={`${job.name} yuklanmoqda`} /> : null}
              <Text variant="caption" tone={job.status === 'failed' ? 'danger' : 'secondary'} numberOfLines={2}>
                {job.status === 'queued'
                  ? `Navbatda · ${formatBytes(job.size)}`
                  : job.status === 'uploading'
                    ? `${Math.round(pct * 100)}% · ${formatBytes(job.sent)} / ${formatBytes(job.size)}`
                    : job.status === 'done'
                      ? 'Yuklandi'
                      : job.status === 'cancelled'
                        ? 'Bekor qilindi'
                        : (job.error ?? 'Yuklanmadi')}
              </Text>
            </View>
            {job.status === 'uploading' || job.status === 'queued' ? (
              <IconButton icon="x" label="Bekor qilish" variant="plain" size={34} onPress={() => uploads.cancel(job.id)} />
            ) : job.status === 'failed' ? (
              <View style={styles.actions}>
                <IconButton icon="refresh-cw" label="Qayta urinish" variant="plain" size={34} onPress={() => uploads.retry(job.id)} />
                <IconButton icon="x" label="Olib tashlash" variant="plain" size={34} onPress={() => uploads.dismiss(job.id)} />
              </View>
            ) : job.status === 'cancelled' ? (
              <IconButton icon="x" label="Olib tashlash" variant="plain" size={34} onPress={() => uploads.dismiss(job.id)} />
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 4 },
  actions: { flexDirection: 'row' },
});
