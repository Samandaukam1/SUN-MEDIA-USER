import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge, Button, Card, Chip, ChipRow, EmptyState, Icon, ItemRow, QueryView, Screen, Section, Sheet, Skeleton, Text, TextArea, ToggleRow, useToast } from '@/components/ui';
import { CONTENT_TYPE, REVISION_STATUS, VERSION_STATUS } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { useSignedUrl } from '@/lib/storage';
import { formatShortDateTime, formatRelativeDeadline } from '@/lib/time';
import { formatTimecode } from '@/lib/timecode';
import { formatBytes } from '@/lib/upload';
import {
  addRevisionComment,
  deleteRevisionComment,
  fetchReview,
  fetchSiblingVersions,
  loadDrafts,
  reviewVersion,
  saveDrafts,
  setCommentResolved,
  setRevisionStatus,
  type ApprovalDecision,
  type DraftComment,
  type Review,
} from './api';
import { CommentList, type CommentItem } from './components/CommentList';
import { ReviewPlayer, type Marker, type PlayerHandle } from './components/ReviewPlayer';

const REFRESH = ['approvals', 'content', 'home', 'dashboard'];
const OPEN_REVISION = ['open', 'in_progress'];

/**
 * One version under review: watch, pause on the exact frame, leave timecoded notes, then approve or
 * request changes. Staff see internal rounds too; clients only what was sent to them (RLS).
 */
export function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['approvals', 'review', id], queryFn: () => fetchReview(id), enabled: !!id });
  if (query.data) return <ReviewBody review={query.data} refreshing={query.isRefetching} onRefresh={() => query.refetch()} />;
  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Versiya' }} />
      <QueryView query={query} skeleton={<Skeleton height={300} rounded={radius.lg} />}>
        {() => <EmptyState icon="eye-off" title="Versiya topilmadi" description="U o‘chirilgan yoki sizga hali yuborilmagan." />}
      </QueryView>
    </Screen>
  );
}

function ReviewBody({ review, refreshing, onRefresh }: { review: Review; refreshing: boolean; onRefresh: () => void }) {
  const { can, appInterface, context } = useAuth();
  const me = useMe();
  const nav = useNav();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const player = useRef<PlayerHandle>(null);
  const media = useSignedUrl(review.file);
  const siblings = useQuery({ queryKey: ['approvals', 'versions', review.content_id], queryFn: () => fetchSiblingVersions(review.content_id) });

  const [drafts, setDrafts] = useState<DraftComment[]>([]);
  useEffect(() => {
    let alive = true;
    loadDrafts(review.id).then((d) => alive && setDrafts(d));
    return () => {
      alive = false;
    };
  }, [review.id]);
  const updateDrafts = (next: DraftComment[]) => {
    setDrafts(next);
    saveDrafts(review.id, next);
  };

  const isClient = appInterface === 'client';
  const clientCanApprove = !!context?.clients.find((c) => c.id === review.client_id)?.permissions.includes('client.approve');
  const canDecide =
    (review.status === 'internal_review' && !isClient && can('approvals.manage')) ||
    (review.status === 'client_review' && (clientCanApprove || (!isClient && can('approvals.manage'))));
  const openRevision = review.revisions.find((r) => OPEN_REVISION.includes(r.status));
  const canCommentOnRevision = !!openRevision && (!isClient || (openRevision.stage === 'client' && clientCanApprove));
  const latest = siblings.data?.[0]?.id === review.id;
  const canUploadNext = !isClient && can('files.upload') && latest && review.status === 'changes_requested' && review.content?.status === 'revision';
  const isVideo = review.file?.kind === 'video';
  const isImage = review.file?.kind === 'image';

  const [composer, setComposer] = useState<{ timecode: number | null } | null>(null);
  const [decision, setDecision] = useState<ApprovalDecision | null>(null);

  const invalidate = () => REFRESH.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

  const decide = useMutation({
    mutationFn: ({ kind, summary }: { kind: ApprovalDecision; summary: string }) => reviewVersion(review.id, kind, summary, kind === 'changes_requested' ? drafts : []),
    onSuccess: (_, { kind }) => {
      updateDrafts([]);
      setDecision(null);
      toast.show(kind === 'changes_requested' ? 'O‘zgartirish so‘rovi yuborildi' : review.status === 'internal_review' ? 'Mijozga yuborildi' : 'Tasdiqlandi. Rahmat!');
      invalidate();
    },
    onError: toast.error,
  });

  const comment = useMutation({
    mutationFn: ({ timecode, body }: { timecode: number | null; body: string }) => addRevisionComment(openRevision!.id, timecode, body),
    onSuccess: () => {
      setComposer(null);
      toast.show('Izoh qo‘shildi');
      invalidate();
    },
    onError: toast.error,
  });

  const resolve = useMutation({
    mutationFn: (item: CommentItem) => setCommentResolved(item.key, !item.resolved),
    onSuccess: invalidate,
    onError: toast.error,
  });

  const remove = useMutation({
    mutationFn: (item: CommentItem) => deleteRevisionComment(item.key),
    onSuccess: invalidate,
    onError: toast.error,
  });

  const startRevision = useMutation({
    mutationFn: (revisionId: string) => setRevisionStatus(revisionId, 'in_progress'),
    onSuccess: () => {
      toast.show('Revision ishga olindi');
      invalidate();
    },
    onError: toast.error,
  });

  const items = useMemo<CommentItem[]>(
    () => [
      ...drafts.map((d) => ({
        key: d.key,
        timecode_ms: d.timecode_ms,
        body: d.body,
        author: me.profile?.full_name ?? null,
        avatar: me.profile?.avatar_url ?? null,
        created_at: null,
        draft: true,
        resolved: false,
        canResolve: false,
        canDelete: true,
      })),
      ...review.revisions.flatMap((r) =>
        r.comments
          .filter((c) => !c.deleted_at)
          .map((c) => ({
            key: c.id,
            timecode_ms: c.timecode_ms,
            body: c.body,
            author: c.author?.full_name ?? null,
            avatar: c.author?.avatar_url ?? null,
            created_at: c.created_at,
            draft: false,
            resolved: c.is_resolved,
            canResolve: !isClient && OPEN_REVISION.includes(r.status),
            canDelete: c.author_id === me.userId && OPEN_REVISION.includes(r.status),
          })),
      ),
    ],
    [drafts, review.revisions, me.profile, me.userId, isClient],
  );
  const markers: Marker[] = items
    .filter((c) => c.timecode_ms != null)
    .map((c) => ({ key: c.key, timecode_ms: c.timecode_ms!, tone: c.draft ? 'draft' : c.resolved ? 'resolved' : 'open' }));

  const openComposer = () => setComposer({ timecode: isVideo ? (player.current?.pauseAt() ?? null) : null });
  const saveComment = (timecode: number | null, body: string) => {
    if (canDecide) {
      updateDrafts([...drafts, { key: `draft-${Date.now()}`, timecode_ms: timecode, body: body.trim() }]);
      setComposer(null);
    } else {
      comment.mutate({ timecode, body });
    }
  };

  const content = review.content;
  const status = VERSION_STATUS[review.status];
  const bottomBar = canDecide || canUploadNext;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: content ? `${content.client?.code ?? ''} ${CONTENT_TYPE[content.content_type].label} #${content.number} · v${review.version_number}` : `v${review.version_number}` }} />
      <Screen edges={[]} refreshing={refreshing} onRefresh={onRefresh} contentStyle={bottomBar ? { paddingBottom: 130 } : undefined}>
        {isVideo ? (
          media.data ? (
            <ReviewPlayer ref={player} url={media.data} durationMs={review.file?.duration_ms ?? null} aspect={review.file?.width && review.file?.height ? review.file.width / review.file.height : null} markers={markers} />
          ) : media.error ? (
            <MediaError onRetry={() => media.refetch()} />
          ) : (
            <Skeleton height={260} rounded={radius.lg} />
          )
        ) : isImage ? (
          media.data ? (
            <Pressable accessibilityRole="imagebutton" accessibilityLabel="Rasmni to‘liq ochish" onPress={() => WebBrowser.openBrowserAsync(media.data!)}>
              <Image source={{ uri: media.data }} style={[styles.image, { backgroundColor: colors.surfaceSunken }]} contentFit="contain" transition={150} />
            </Pressable>
          ) : (
            <Skeleton height={260} rounded={radius.lg} />
          )
        ) : (
          <Card>
            <ItemRow
              first
              icon="file"
              title={review.file?.name ?? 'Fayl'}
              subtitle={formatBytes(review.file?.size_bytes)}
              onPress={media.data ? () => WebBrowser.openBrowserAsync(media.data!) : undefined}
            />
          </Card>
        )}

        {canDecide || canCommentOnRevision ? (
          <Button
            title={isVideo ? 'Shu joyga izoh qo‘shish' : 'Izoh qo‘shish'}
            icon="message-square"
            variant="secondary"
            onPress={openComposer}
          />
        ) : null}

        {(siblings.data?.length ?? 0) > 1 ? (
          <ChipRow>
            {siblings.data!.map((v) => (
              <Chip
                key={v.id}
                label={`v${v.version_number} · ${VERSION_STATUS[v.status].label}`}
                selected={v.id === review.id}
                onPress={() => v.id !== review.id && router.replace(`${nav.base}/approvals/${v.id}` as Href)}
              />
            ))}
          </ChipRow>
        ) : null}

        <Card style={styles.info}>
          <Text variant="micro" tone="tertiary">
            {[content?.client?.name, content ? CONTENT_TYPE[content.content_type].label : null, `Versiya ${review.version_number}`].filter(Boolean).join(' · ').toUpperCase()}
          </Text>
          <Text variant="title">{content?.title ?? 'Kontent'}</Text>
          <View style={styles.badges}>
            <Badge label={status.label} tone={status.tone} icon={status.icon} />
            {review.status === 'client_review' && content?.client_approval_due_at ? (
              <Badge
                label={`Tasdiq: ${formatRelativeDeadline(content.client_approval_due_at)}`}
                tone={new Date(content.client_approval_due_at).getTime() < Date.now() ? 'danger' : 'neutral'}
                icon="clock"
              />
            ) : null}
          </View>
          <Text variant="caption" tone="secondary">
            {[review.submitter?.full_name, `yuborildi ${formatShortDateTime(review.submitted_at)}`, review.sent_to_client_at && !isClient ? `mijozga ${formatShortDateTime(review.sent_to_client_at)}` : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {review.notes ? (
            <View style={[styles.note, { backgroundColor: colors.surfaceSunken }]}>
              <Text variant="caption" tone="tertiary">
                Versiya haqida
              </Text>
              <Text variant="body">{review.notes}</Text>
            </View>
          ) : null}
          <Button title="Kontentni ochish" icon="arrow-right" variant="ghost" size="md" fullWidth={false} onPress={() => nav.content(review.content_id)} />
        </Card>

        {review.revisions.map((r) => {
          const total = r.comments.filter((c) => !c.deleted_at).length;
          const done = r.comments.filter((c) => !c.deleted_at && c.is_resolved).length;
          return (
            <Card key={r.id} style={styles.info}>
              <View style={styles.revHead}>
                <Icon name="rotate-ccw" size={18} color={colors.danger} />
                <Text variant="bodyMedium" style={styles.flex}>
                  Revision #{r.revision_number} · {r.stage === 'client' ? 'mijoz' : 'ichki'}
                </Text>
                <Badge label={REVISION_STATUS[r.status].label} tone={REVISION_STATUS[r.status].tone} />
              </View>
              {r.summary ? <Text variant="body">{r.summary}</Text> : null}
              <Text variant="caption" tone="secondary">
                {[r.requester?.full_name, formatShortDateTime(r.requested_at), total ? `${done}/${total} tuzatildi` : null].filter(Boolean).join(' · ')}
              </Text>
              {!isClient && r.status === 'open' ? (
                <Button title="Ishni boshlash" icon="play-circle" variant="secondary" size="md" loading={startRevision.isPending} onPress={() => startRevision.mutate(r.id)} />
              ) : null}
            </Card>
          );
        })}

        <Section title={`Izohlar${items.length ? ` · ${items.length}` : ''}`}>
          {items.length ? (
            <CommentList
              items={items}
              onSeek={isVideo ? (ms) => player.current?.seek(ms) : undefined}
              onToggleResolved={(item) => resolve.mutate(item)}
              onDelete={(item) => (item.draft ? updateDrafts(drafts.filter((d) => d.key !== item.key)) : remove.mutate(item))}
            />
          ) : (
            <Text variant="caption" tone="tertiary">
              {canDecide
                ? isVideo
                  ? 'Videoni ko‘ring, kerakli joyda to‘xtatib “Shu joyga izoh qo‘shish” tugmasini bosing. Izohlar qaror bilan birga yuboriladi.'
                  : 'Izohlaringizni qo‘shing — ular qaror bilan birga yuboriladi.'
                : 'Izoh yo‘q.'}
            </Text>
          )}
        </Section>

        {review.decisions.length ? (
          <Section title="Qarorlar">
            <Card padded={false}>
              {[...review.decisions]
                .sort((a, b) => b.decided_at.localeCompare(a.decided_at))
                .map((d, i) => (
                  <ItemRow
                    key={d.id}
                    first={i === 0}
                    icon={d.decision === 'approved' ? 'check-circle' : 'rotate-ccw'}
                    title={`${d.decision === 'approved' ? (d.stage === 'internal' ? 'Ichki tekshiruvdan o‘tdi' : 'Mijoz tasdiqladi') : 'O‘zgartirish so‘raldi'}`}
                    subtitle={[d.decider?.full_name, formatShortDateTime(d.decided_at), d.comment].filter(Boolean).join(' · ')}
                  />
                ))}
            </Card>
          </Section>
        ) : null}
      </Screen>

      {bottomBar ? (
        <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {canDecide && review.status === 'client_review' && !isClient ? (
            <Text variant="caption" tone="tertiary" align="center">
              Mijoz javobini kutmoqda — kerak bo‘lsa, uning nomidan qaror qilishingiz mumkin.
            </Text>
          ) : null}
          {canDecide ? (
            <View style={styles.row}>
              <Button title="O‘zgartirish" icon="rotate-ccw" variant="secondary" fullWidth={false} style={styles.flex} onPress={() => setDecision('changes_requested')} />
              <Button
                title={review.status === 'internal_review' ? 'Mijozga yuborish' : 'Tasdiqlash'}
                icon="check"
                fullWidth={false}
                style={styles.flex}
                onPress={() => setDecision('approved')}
              />
            </View>
          ) : (
            <Button title="Yangi versiya yuklash" icon="upload" onPress={() => nav.go(`/content/submit/${review.content_id}`)} />
          )}
        </View>
      ) : null}

      <CommentComposer
        target={composer}
        isVideo={isVideo}
        draft={canDecide}
        saving={comment.isPending}
        onClose={() => setComposer(null)}
        onSave={saveComment}
      />
      <DecisionSheet
        decision={decision}
        stage={review.status === 'internal_review' ? 'internal' : 'client'}
        drafts={drafts.length}
        saving={decide.isPending}
        onClose={() => setDecision(null)}
        onSubmit={(summary) => decision && decide.mutate({ kind: decision, summary })}
      />
    </View>
  );
}

function MediaError({ onRetry }: { onRetry: () => void }) {
  return (
    <Card style={styles.info}>
      <Text variant="bodyMedium">Faylni ochib bo‘lmadi</Text>
      <Button title="Qayta urinish" icon="refresh-cw" variant="secondary" size="md" onPress={onRetry} />
    </Card>
  );
}

function CommentComposer({
  target,
  isVideo,
  draft,
  saving,
  onClose,
  onSave,
}: {
  target: { timecode: number | null } | null;
  isVideo: boolean;
  draft: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (timecode: number | null, body: string) => void;
}) {
  const [body, setBody] = useState('');
  const [timed, setTimed] = useState(true);
  useEffect(() => {
    if (target) {
      setBody('');
      setTimed(target.timecode != null);
    }
  }, [target]);
  const timecode = timed ? (target?.timecode ?? null) : null;
  return (
    <Sheet
      visible={!!target}
      onClose={onClose}
      title={timecode != null ? `Izoh · ${formatTimecode(timecode)}` : 'Izoh'}
      actionLabel={draft ? 'Qo‘shish' : 'Yuborish'}
      actionDisabled={!body.trim() || saving}
      onAction={() => onSave(timecode, body)}
    >
      {isVideo && target?.timecode != null ? (
        <ToggleRow label={`Vaqtga bog‘lash (${formatTimecode(target.timecode)})`} value={timed} onChange={setTimed} />
      ) : null}
      <TextArea label="Nima o‘zgarsin?" value={body} onChangeText={setBody} maxLength={2000} minHeight={120} autoFocus placeholder="Masalan: logotipni kattaroq qiling" />
      <Text variant="caption" tone="tertiary">
        {draft ? 'Izoh telefoningizda saqlanadi va “O‘zgartirish” qarori bilan birga yuboriladi.' : 'Izoh darhol revisionga qo‘shiladi va jamoa ko‘radi.'}
      </Text>
    </Sheet>
  );
}

function DecisionSheet({
  decision,
  stage,
  drafts,
  saving,
  onClose,
  onSubmit,
}: {
  decision: ApprovalDecision | null;
  stage: 'internal' | 'client';
  drafts: number;
  saving: boolean;
  onClose: () => void;
  onSubmit: (summary: string) => void;
}) {
  const [summary, setSummary] = useState('');
  useEffect(() => {
    if (decision) setSummary('');
  }, [decision]);
  const changes = decision === 'changes_requested';
  const blocked = changes && !summary.trim() && drafts === 0;
  return (
    <Sheet
      visible={!!decision}
      onClose={onClose}
      title={changes ? 'O‘zgartirish so‘rash' : stage === 'internal' ? 'Mijozga yuborish' : 'Tasdiqlash'}
      actionLabel="Yuborish"
      actionDisabled={blocked || saving}
      onAction={() => onSubmit(summary)}
    >
      {changes ? (
        <>
          <Text variant="body">
            {drafts ? `${drafts} ta vaqtli izoh yuboriladi.` : 'Vaqtli izoh qo‘shilmagan — nima o‘zgarishi kerakligini yozing.'}
          </Text>
          <TextArea label="Umumiy izoh" value={summary} onChangeText={setSummary} maxLength={2000} minHeight={120} placeholder="Masalan: musiqa va yakuniy kadrni almashtiring" />
        </>
      ) : (
        <>
          <Text variant="body">
            {stage === 'internal'
              ? 'Versiya ichki tekshiruvdan o‘tadi va mijozga tasdiqlash uchun yuboriladi.'
              : 'Versiya yakuniy deb belgilanadi va APPROVED papkasiga o‘tadi.'}
          </Text>
          {drafts ? (
            <View style={styles.warn}>
              <Icon name="alert-triangle" size={16} color="#B45309" />
              <Text variant="caption" style={styles.flex}>
                {drafts} ta yuborilmagan izoh bor. Tasdiqlasangiz ular yuborilmaydi — o‘zgartirish kerak bo‘lsa “O‘zgartirish”ni tanlang.
              </Text>
            </View>
          ) : null}
          <TextArea label="Izoh (ixtiyoriy)" value={summary} onChangeText={setSummary} maxLength={2000} minHeight={80} placeholder={stage === 'client' ? 'Masalan: zo‘r chiqibdi!' : undefined} />
        </>
      )}
      <Button title={changes ? 'O‘zgartirish so‘rash' : stage === 'internal' ? 'Mijozga yuborish' : 'Tasdiqlash'} icon={changes ? 'rotate-ccw' : 'check'} loading={saving} disabled={blocked} onPress={() => onSubmit(summary)} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  image: { width: '100%', height: 320, borderRadius: radius.lg },
  info: { gap: spacing.sm },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  note: { gap: 2, padding: spacing.md, borderRadius: radius.md },
  revHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  warn: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', padding: spacing.md, borderRadius: radius.md, backgroundColor: 'rgba(251,191,36,0.14)' },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: spacing.sm, paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth },
});
