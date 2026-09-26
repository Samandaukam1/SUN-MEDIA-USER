import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, EmptyState, ItemRow, QueryView, SegmentedControl, Sheet, Text, TextArea, TextField, useToast } from '@/components/ui';
import { PLATFORM, PUBLICATION_STATUS, REVISION_STATUS, VERSION_STATUS } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useNav } from '@/lib/routes';
import { formatBytes } from '@/lib/upload';
import { uploads, useUploads } from '@/lib/uploadQueue';
import { fetchSystemFolderId } from '@/features/files/api';
import { UploadList } from '@/features/files/components/UploadList';
import { FileThumb } from '@/features/files/FolderScreen';
import { pickForUpload } from '@/features/files/pick';
import { formatAgo, formatShortDateTime } from '@/lib/time';
import type { Database } from '@/types/database';
import { addComment, fetchComments, fetchContentFiles, updatePublication, type ContentDetail } from '../api';

type Enums = Database['public']['Enums'];



export function MediaSection({ contentId, clientId }: { contentId: string; clientId: string }) {
  const nav = useNav();
  const toast = useToast();
  const { can, appInterface } = useAuth();
  const files = useQuery({ queryKey: ['files', 'content', contentId], queryFn: () => fetchContentFiles(contentId) });
  const jobs = useUploads((t) => t.contentId === contentId && !!t.folderId);
  const canUpload = appInterface !== 'client' && can('files.upload');
  const upload = async () => {
    try {
      const picked = await pickForUpload();
      if (!picked.length) return;
      const folderId = await fetchSystemFolderId(clientId, 'raw');
      picked.filter((p) => p.size).forEach((source) => uploads.enqueue(source, { clientId, folderId, contentId }));
      if (picked.some((p) => !p.size)) toast.show('Ba’zi fayllar hajmi aniqlanmadi — “Fayllar” orqali tanlang', 'error');
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <>
      <UploadList jobs={jobs} />
      <QueryView
        query={files}
        isEmpty={(d) => d.length === 0 && jobs.length === 0}
        empty={{ icon: 'image', title: 'Media hali yo‘q', description: 'Syomka materiallari, montaj versiyalari va dizaynlar shu yerda to‘planadi.' }}
      >
        {(list) =>
          list.length ? (
            <Card padded={false}>
              {list.map((f, i) => (
                <ItemRow
                  key={f.id}
                  first={i === 0}
                  leading={<FileThumb file={f} size={36} />}
                  title={f.name}
                  subtitle={[formatBytes(f.size_bytes), f.uploader?.full_name, formatShortDateTime(f.created_at)].filter(Boolean).join(' · ')}
                  right={f.visibility === 'internal' && appInterface !== 'client' ? <Badge label="Ichki" /> : undefined}
                  onPress={() => nav.file(f.id)}
                />
              ))}
            </Card>
          ) : null
        }
      </QueryView>
      {canUpload ? <Button title="Material yuklash (RAW)" icon="upload" variant="secondary" onPress={upload} /> : null}
    </>
  );
}

const CLOSED: Enums['content_status'][] = ['approved', 'scheduled', 'published', 'cancelled'];

export function ApprovalSection({ c }: { c: ContentDetail }) {
  const nav = useNav();
  const { can, appInterface } = useAuth();
  const versions = [...c.versions].sort((a, b) => b.version_number - a.version_number);
  const canUpload = appInterface !== 'client' && can('files.upload') && !CLOSED.includes(c.status);
  return (
    <>
      {versions.length === 0 ? (
        <EmptyState icon="check-circle" title="Hali versiya yuborilmagan" description="Montajyor birinchi versiyani yuborganda tasdiqlash jarayoni shu yerda boshlanadi." />
      ) : (
        <Card padded={false}>
          {versions.map((v, i) => {
            const status = VERSION_STATUS[v.status];
            return (
              <ItemRow
                key={v.id}
                first={i === 0}
                icon={status.icon}
                title={`Versiya v${v.version_number}`}
                subtitle={[
                  v.sent_to_client_at ? `Mijozga: ${formatShortDateTime(v.sent_to_client_at)}` : `Yuborilgan: ${formatShortDateTime(v.submitted_at)}`,
                  v.decided_at ? `Qaror: ${formatShortDateTime(v.decided_at)}` : null,
                  v.notes,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                right={<Badge label={status.label} tone={status.tone} />}
                onPress={() => nav.review(v.id)}
              />
            );
          })}
        </Card>
      )}
      {canUpload ? <Button title={versions.length ? 'Yangi versiya yuklash' : 'Birinchi versiyani yuklash'} icon="upload" variant="secondary" onPress={() => nav.go(`/content/submit/${c.id}`)} /> : null}
    </>
  );
}

export function RevisionSection({ c }: { c: ContentDetail }) {
  const nav = useNav();
  const revisions = [...c.revisions].sort((a, b) => b.revision_number - a.revision_number);
  if (revisions.length === 0) return <EmptyState icon="rotate-ccw" title="Revision yo‘q" description="Mijoz yoki ichki tekshiruv o‘zgartirish so‘rasa, shu yerda ko‘rinadi." />;
  return (
    <Card padded={false}>
      {revisions.map((r, i) => (
        <ItemRow
          key={r.id}
          first={i === 0}
          icon="rotate-ccw"
          title={`Revision #${r.revision_number}${r.stage === 'client' ? ' · mijoz' : ' · ichki'}`}
          subtitle={[r.summary, formatShortDateTime(r.requested_at)].filter(Boolean).join(' · ')}
          right={<Badge label={REVISION_STATUS[r.status].label} tone={REVISION_STATUS[r.status].tone} />}
          onPress={r.version_id ? () => nav.review(r.version_id!) : undefined}
        />
      ))}
    </Card>
  );
}

export function PublishingSection({ c }: { c: ContentDetail }) {
  const { can } = useAuth();
  const [marking, setMarking] = useState<string | null>(null);
  const publications = c.publications.filter((p) => p.status !== 'cancelled');
  const manage = can('publications.manage') || can('content.manage');
  if (publications.length === 0) return <EmptyState icon="send" title="Nashr rejalashtirilmagan" description="Platforma va nashr vaqti kontent tahririda belgilanadi." />;
  return (
    <>
      <Card padded={false}>
        {publications.map((p, i) => {
          const status = PUBLICATION_STATUS[p.status];
          return (
            <ItemRow
              key={p.id}
              first={i === 0}
              icon={PLATFORM[p.platform].icon}
              title={PLATFORM[p.platform].label}
              subtitle={
                p.published_at
                  ? `Joylandi: ${formatShortDateTime(p.published_at)}`
                  : p.scheduled_at
                    ? `Reja: ${formatShortDateTime(p.scheduled_at)}`
                    : 'Vaqt belgilanmagan'
              }
              right={<Badge label={status.label} tone={status.tone} />}
              onPress={p.post_url ? () => WebBrowser.openBrowserAsync(p.post_url!) : manage && p.status !== 'published' ? () => setMarking(p.id) : undefined}
            />
          );
        })}
      </Card>
      {manage ? (
        <Text variant="caption" tone="tertiary">
          Nashr qilingan platformani bosing va post havolasini kiriting — kontent avtomatik “Joylandi” holatiga o‘tadi.
        </Text>
      ) : null}
      <MarkPublishedSheet publicationId={marking} onClose={() => setMarking(null)} />
    </>
  );
}

function MarkPublishedSheet({ publicationId, onClose }: { publicationId: string | null; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('https://');
  const mutation = useMutation({
    mutationFn: () => updatePublication(publicationId!, { status: 'published', post_url: url === 'https://' ? null : url }),
    onSuccess: () => {
      toast.show('Nashr belgilandi');
      queryClient.invalidateQueries({ queryKey: ['content'] });
      setUrl('https://');
      onClose();
    },
    onError: toast.error,
  });
  return (
    <Sheet visible={!!publicationId} onClose={onClose} title="Joylandi deb belgilash" actionLabel="Saqlash" onAction={() => mutation.mutate()} actionDisabled={mutation.isPending}>
      <TextField label="Post havolasi" value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" hint="Instagram, TikTok yoki boshqa platformadagi post manzili" />
    </Sheet>
  );
}

export function CommentsSection({ c }: { c: ContentDetail }) {
  const me = useMe();
  const toast = useToast();
  const queryClient = useQueryClient();
  const isStaff = me.kind === 'staff';
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<'internal' | 'client'>(isStaff ? 'internal' : 'client');
  const comments = useQuery({ queryKey: ['content', 'comments', c.id], queryFn: () => fetchComments(c.id) });
  const send = useMutation({
    mutationFn: () => addComment(c.id, c.client_id, me.userId, body, isStaff ? visibility : 'client'),
    onSuccess: () => {
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['content', 'comments', c.id] });
    },
    onError: toast.error,
  });
  return (
    <>
      <QueryView query={comments} isEmpty={(d) => d.length === 0} empty={{ icon: 'message-circle', title: 'Izohlar yo‘q', description: 'Kontent bo‘yicha fikrlar shu yerda saqlanadi.' }}>
        {(list) => (
          <View style={styles.comments}>
            {list.map((cm) => (
              <Card key={cm.id} variant={cm.visibility === 'internal' ? 'sunken' : 'default'} style={styles.comment}>
                <View style={styles.commentHead}>
                  <Avatar name={cm.author?.full_name} url={cm.author?.avatar_url} size={24} />
                  <Text variant="captionMedium" style={styles.flex} numberOfLines={1}>
                    {cm.author?.full_name}
                  </Text>
                  {isStaff && cm.visibility === 'internal' ? <Badge label="Ichki" /> : null}
                  <Text variant="micro" tone="tertiary">
                    {formatAgo(cm.created_at)}
                  </Text>
                </View>
                <Text variant="body" selectable>
                  {cm.body}
                </Text>
              </Card>
            ))}
          </View>
        )}
      </QueryView>
      <Card style={styles.compose}>
        {isStaff ? (
          <SegmentedControl
            options={[
              { value: 'internal', label: 'Ichki (faqat jamoa)' },
              { value: 'client', label: 'Mijozga ko‘rinadi' },
            ]}
            value={visibility}
            onChange={setVisibility}
          />
        ) : null}
        <TextArea label="Izoh" value={body} onChangeText={setBody} maxLength={4000} minHeight={70} placeholder="Fikringizni yozing" />
        <Button title="Yuborish" icon="send" size="md" loading={send.isPending} disabled={!body.trim()} onPress={() => send.mutate()} />
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  comments: { gap: spacing.sm },
  comment: { gap: spacing.sm },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  compose: { gap: spacing.md },
});
