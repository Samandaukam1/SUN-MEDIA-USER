import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  HeaderButton,
  Icon,
  ItemRow,
  ProgressBar,
  QueryView,
  Screen,
  Section,
  Text,
  TextArea,
  useToast,
} from '@/components/ui';
import { OVERDUE, PRIORITY, TASK_STATUS, TASK_TYPE } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { UploadList } from '@/features/files/components/UploadList';
import { FileThumb } from '@/features/files/FolderScreen';
import { pickForUpload } from '@/features/files/pick';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { formatBytes } from '@/lib/upload';
import { uploads, useUploads } from '@/lib/uploadQueue';
import { formatAgo, formatDateKeyLong, formatRelativeDeadline, formatShortDateTime, formatTime, agencyDateKey } from '@/lib/time';
import { addTaskComment, fetchTask, fetchTaskAlertRules, setChecklistItem, setTaskStatus, type TaskDetail, type TaskStatus } from './api';
import { isTaskOverdue } from './components/TaskCard';

type Action = { status: TaskStatus; label: string; icon: 'play' | 'send' | 'check' | 'rotate-ccw' | 'x' };

/** Next steps: assignees move work forward; managers also accept, return or cancel. */
function actionsFor(status: TaskStatus, manager: boolean, assignee: boolean): Action[] {
  const out: Action[] = [];
  if (assignee || manager) {
    if (status === 'todo') out.push({ status: 'in_progress', label: 'Boshlash', icon: 'play' });
    if (status === 'in_progress') out.push({ status: 'in_review', label: 'Tekshiruvga', icon: 'send' }, { status: 'done', label: 'Bajarildi', icon: 'check' });
    if (status === 'revision') out.push({ status: 'in_progress', label: 'Qayta boshlash', icon: 'play' });
  }
  if (manager) {
    if (status === 'in_review') out.push({ status: 'done', label: 'Qabul qilish', icon: 'check' }, { status: 'revision', label: 'Qaytarish', icon: 'rotate-ccw' });
    if (status === 'done' || status === 'cancelled') out.push({ status: 'todo', label: 'Qayta ochish', icon: 'rotate-ccw' });
  }
  return out;
}

export function TaskScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const nav = useNav();
  const query = useQuery({ queryKey: ['tasks', 'detail', id], queryFn: () => fetchTask(id), enabled: !!id });
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Vazifa',
          headerRight: can('tasks.manage') && query.data ? () => <HeaderButton icon="edit-2" label="Tahrirlash" onPress={() => nav.go(`/task/edit/${id}`)} /> : undefined,
        }}
      />
      <QueryView query={query}>{(t) => <Body t={t} refresh={() => query.refetch()} refreshing={query.isRefetching} />}</QueryView>
    </>
  );
}

function Body({ t, refresh, refreshing }: { t: TaskDetail; refresh: () => void; refreshing: boolean }) {
  const me = useMe();
  const { can } = useAuth();
  const nav = useNav();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [comment, setComment] = useState('');
  const assignee = t.assignees.some((a) => a.person?.id === me.userId);
  const manager = can('tasks.manage');
  const overdue = isTaskOverdue(t);
  const status = overdue ? OVERDUE : TASK_STATUS[t.status];
  const type = TASK_TYPE[t.task_type];
  const blockers = t.dependencies.filter((d) => d.status !== 'done' && d.status !== 'cancelled');
  const done = t.checklist.filter((c) => c.is_done).length;
  const actions = actionsFor(t.status, manager, assignee);
  const rules = useQuery({ queryKey: ['tasks', 'alert-rules'], queryFn: fetchTaskAlertRules, enabled: !!t.due_at && t.status !== 'done' });
  const canAttach = manager || ((assignee || t.creator?.id === me.userId) && can('files.upload'));
  const jobs = useUploads((target) => target.taskId === t.id);
  const attach = async () => {
    const picked = await pickForUpload();
    picked.filter((p) => p.size).forEach((source) => uploads.enqueue(source, { taskId: t.id }));
    if (picked.some((p) => !p.size)) toast.show('Ba’zi fayllar hajmi aniqlanmadi — “Fayllar” orqali tanlang', 'error');
  };

  const invalidate = () => ['tasks', 'home', 'dashboard', 'calendar'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  const move = useMutation({
    mutationFn: (next: TaskStatus) => setTaskStatus(t.id, next),
    onSuccess: (_, next) => {
      toast.show(`Vazifa: ${TASK_STATUS[next].label}`);
      invalidate();
    },
    onError: toast.error,
  });
  const tick = useMutation({ mutationFn: ({ id, v }: { id: string; v: boolean }) => setChecklistItem(id, v), onSuccess: invalidate, onError: toast.error });
  const send = useMutation({
    mutationFn: () => addTaskComment(t.id, me.userId, comment),
    onSuccess: () => {
      setComment('');
      invalidate();
    },
    onError: toast.error,
  });

  return (
    <View style={styles.fill}>
      <Screen edges={[]} refreshing={refreshing} onRefresh={refresh} contentStyle={actions.length ? { paddingBottom: 140 } : undefined}>
        <Card style={styles.header}>
          <View style={styles.kicker}>
            <Icon name={type.icon} size={14} color={colors.textTertiary} />
            <Text variant="micro" tone="tertiary">
              {[type.label, t.client?.name].filter(Boolean).join(' · ').toUpperCase()}
            </Text>
          </View>
          <Text variant="title">{t.title}</Text>
          <View style={styles.badges}>
            <Badge label={status.label} tone={status.tone} icon={status.icon} />
            {t.priority !== 'normal' ? <Badge label={PRIORITY[t.priority].label} tone={PRIORITY[t.priority].tone} icon={PRIORITY[t.priority].icon} /> : null}
            {blockers.length ? <Badge label="Kutilmoqda" tone="warning" icon="lock" /> : null}
          </View>
          {t.due_at ? (
            <View style={[styles.deadline, { backgroundColor: overdue ? colors.dangerSoft : colors.surfaceSunken }]}>
              <View>
                <Text variant="micro" tone="tertiary">
                  MUDDAT
                </Text>
                <Text variant="metricSmall" tone={overdue ? 'danger' : 'primary'}>
                  {formatTime(t.due_at)}
                </Text>
                <Text variant="caption" tone="secondary">
                  {formatDateKeyLong(agencyDateKey(t.due_at))}
                </Text>
              </View>
              {t.status !== 'done' && t.status !== 'cancelled' ? (
                <Text variant="captionMedium" tone={overdue ? 'danger' : 'secondary'} style={styles.relative}>
                  {formatRelativeDeadline(t.due_at)}
                </Text>
              ) : t.completed_at ? (
                <Text variant="captionMedium" tone="success" style={styles.relative}>
                  Bajarildi {formatShortDateTime(t.completed_at)}
                </Text>
              ) : null}
            </View>
          ) : null}
        </Card>

        {blockers.length ? (
          <Section title="Avval bajarilishi kerak">
            <Card padded={false}>
              {blockers.map((d, i) => (
                <ItemRow key={d.id} first={i === 0} icon="lock" title={d.title} subtitle={`${TASK_STATUS[d.status as TaskStatus].label}${d.due_at ? ` · ${formatShortDateTime(d.due_at)}` : ''}`} onPress={() => nav.task(d.id)} />
              ))}
            </Card>
          </Section>
        ) : null}

        {t.checklist.length ? (
          <Section title={`Checklist · ${done}/${t.checklist.length}`}>
            <Card padded={false}>
              <View style={styles.progress}>
                <ProgressBar value={done / t.checklist.length} label="Checklist" />
              </View>
              {t.checklist.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.is_done, disabled: !(assignee || manager) }}
                  disabled={!(assignee || manager) || tick.isPending}
                  onPress={() => tick.mutate({ id: item.id, v: !item.is_done })}
                  style={[styles.check, { borderTopColor: colors.border }]}
                >
                  <View style={[styles.box, { borderColor: item.is_done ? colors.accent : colors.borderStrong, backgroundColor: item.is_done ? colors.accent : 'transparent' }]}>
                    {item.is_done ? <Icon name="check" size={13} color={colors.accentText} /> : null}
                  </View>
                  <Text variant="body" style={[styles.flex, item.is_done && { color: colors.textTertiary, textDecorationLine: 'line-through' }]}>
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </Card>
          </Section>
        ) : null}

        <Section title="Kimlar">
          <Card padded={false}>
            {t.assignees.map((a, i) =>
              a.person ? <ItemRow key={a.person.id} first={i === 0} leading={<Avatar name={a.person.full_name} url={a.person.avatar_url} size={32} />} title={a.person.full_name} subtitle="Mas’ul" /> : null,
            )}
            {t.creator ? (
              <ItemRow first={t.assignees.length === 0} leading={<Avatar name={t.creator.full_name} url={t.creator.avatar_url} size={32} />} title={t.creator.full_name} subtitle={`Yaratdi · ${formatShortDateTime(t.created_at)}`} />
            ) : null}
          </Card>
        </Section>

        {t.content || t.shooting || t.project ? (
          <Section title="Bog‘liq">
            <Card padded={false}>
              {t.project ? <ItemRow first icon="folder" title={t.project.name} subtitle="Loyiha" onPress={() => nav.project(t.project!.id)} /> : null}
              {t.content ? <ItemRow first={!t.project} icon="film" title={t.content.title} subtitle="Kontent" onPress={() => nav.content(t.content!.id)} /> : null}
              {t.shooting ? (
                <ItemRow first={!t.project && !t.content} icon="video" title={t.shooting.title} subtitle={`Syomka · ${formatShortDateTime(t.shooting.starts_at)}`} onPress={() => nav.shooting(t.shooting!.id)} />
              ) : null}
            </Card>
          </Section>
        ) : null}

        {t.description ? (
          <Section title="Tavsif">
            <Card>
              <Text variant="body" selectable>
                {t.description}
              </Text>
            </Card>
          </Section>
        ) : null}

        {t.due_at && t.status !== 'done' && t.status !== 'cancelled' && rules.data?.length ? (
          <Section title="Eslatmalar">
            <Card padded={false}>
              {rules.data
                .filter((r) => !r.task_types?.length || r.task_types.includes(t.task_type))
                .map((r, i) => {
                  const at = new Date(new Date(t.due_at!).getTime() + r.offset_minutes * 60_000).toISOString();
                  const passed = new Date(at).getTime() < Date.now();
                  return (
                    <ItemRow
                      key={r.id}
                      first={i === 0}
                      icon={r.offset_minutes >= 0 ? 'alert-octagon' : 'bell'}
                      title={`${formatTime(at)} — ${r.offset_minutes >= 0 ? 'Overdue' : `${Math.abs(r.offset_minutes) >= 60 ? `${Math.abs(r.offset_minutes) / 60} soat` : `${Math.abs(r.offset_minutes)} daqiqa`} qolganda`}`}
                      subtitle={r.recipients.map((x) => ({ assignees: 'mas’ullar', admins: 'admin', owners: 'owner', managers: 'menejer', client_approvers: 'mijoz' })[x] ?? x).join(', ')}
                      right={passed ? <Badge label="Yuborilgan" /> : undefined}
                    />
                  );
                })}
            </Card>
          </Section>
        ) : null}

        {t.files.length || canAttach ? (
          <Section title={`Fayllar${t.files.length ? ` · ${t.files.length}` : ''}`} actionLabel={canAttach ? 'Biriktirish' : undefined} onAction={canAttach ? attach : undefined}>
            <UploadList jobs={jobs} />
            {t.files.length ? (
              <Card padded={false}>
                {t.files.map((f, i) => (
                  <ItemRow
                    key={f.id}
                    first={i === 0}
                    leading={<FileThumb file={f} size={36} />}
                    title={f.name}
                    subtitle={[formatBytes(f.size_bytes), f.uploader?.full_name, formatShortDateTime(f.created_at)].filter(Boolean).join(' · ')}
                    onPress={() => nav.file(f.id)}
                  />
                ))}
              </Card>
            ) : jobs.length ? null : (
              <Text variant="caption" tone="tertiary">
                Brif, ssenariy, referens yoki tayyor ishni shu yerga biriktiring.
              </Text>
            )}
          </Section>
        ) : null}

        <Section title={`Izohlar · ${t.comments.length}`}>
          {t.comments.length === 0 ? <EmptyState icon="message-circle" title="Hali izoh yo‘q" /> : null}
          {t.comments.map((c) => (
            <Card key={c.id} style={styles.comment}>
              <View style={styles.commentHead}>
                <Avatar name={c.author?.full_name} url={c.author?.avatar_url} size={24} />
                <Text variant="captionMedium" style={styles.flex}>
                  {c.author?.full_name}
                </Text>
                <Text variant="micro" tone="tertiary">
                  {formatAgo(c.created_at)}
                </Text>
              </View>
              <Text variant="body" selectable>
                {c.body}
              </Text>
            </Card>
          ))}
          {assignee || manager ? (
            <Card style={styles.compose}>
              <TextArea label="Izoh" value={comment} onChangeText={setComment} maxLength={4000} minHeight={70} placeholder="Holat, savol yoki natija" />
              <Button title="Yuborish" icon="send" size="md" disabled={!comment.trim()} loading={send.isPending} onPress={() => send.mutate()} />
            </Card>
          ) : null}
        </Section>
      </Screen>

      {actions.length ? (
        <View style={[styles.sticky, { paddingBottom: Math.max(insets.bottom, spacing.lg), backgroundColor: colors.background, borderTopColor: colors.border }]}>
          {blockers.length && t.status === 'todo' ? (
            <Text variant="caption" tone="warning" align="center">
              Bog‘liq vazifa hali tugamagan
            </Text>
          ) : null}
          <View style={styles.actionRow}>
            {actions.slice(0, 2).map((a, i) => (
              <Button key={a.status} title={a.label} icon={a.icon} variant={i === 0 ? 'primary' : 'secondary'} fullWidth={false} style={styles.flex} loading={move.isPending && move.variables === a.status} onPress={() => move.mutate(a.status)} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { gap: spacing.md },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  deadline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.md },
  relative: { maxWidth: '50%', textAlign: 'right' },
  progress: { padding: spacing.lg, paddingBottom: spacing.sm },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 50 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  comment: { gap: spacing.sm },
  commentHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compose: { gap: spacing.md },
  sticky: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.md },
});
