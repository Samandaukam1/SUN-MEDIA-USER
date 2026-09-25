import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, DateField, FormSection, IconButton, QueryView, Screen, SelectField, Text, TextArea, TextField, TimeField, useToast } from '@/components/ui';
import { CONTENT_TYPE, PRIORITY, TASK_STATUS, TASK_TYPE } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { fetchTeamDirectory } from '@/features/team/api';
import { UserFacingError } from '@/lib/errors';
import { useInterfaceBase } from '@/lib/routes';
import { agencyDateKey, agencyDateTimeToIso, agencyTimeKey } from '@/lib/time';
import type { Database } from '@/types/database';
import { fetchTask, fetchTaskFormOptions, saveTask, taskFormSchema, type TaskDetail, type TaskStatus, type TaskType } from './api';

type Priority = Database['public']['Enums']['priority_level'];
type ChecklistRow = { id?: string; title: string; is_done: boolean };

export function TaskFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useQuery({ queryKey: ['tasks', 'detail', id], queryFn: () => fetchTask(id!), enabled: !!id });
  return (
    <>
      <Stack.Screen options={{ title: id ? 'Vazifani tahrirlash' : 'Yangi vazifa' }} />
      {id ? <QueryView query={existing}>{(t) => <Form initial={t} />}</QueryView> : <Form initial={null} />}
    </>
  );
}

function Form({ initial }: { initial: TaskDetail | null }) {
  const toast = useToast();
  const router = useRouter();
  const base = useInterfaceBase();
  const queryClient = useQueryClient();
  const preset = useLocalSearchParams<{ clientId?: string; contentId?: string }>();
  const [clientId, setClientId] = useState<string | null>(initial?.client_id ?? preset.clientId ?? null);
  const [projectId, setProjectId] = useState<string | null>(initial?.project_id ?? null);
  const [contentId, setContentId] = useState<string | null>(initial?.content_id ?? preset.contentId ?? null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [type, setType] = useState<TaskType>(initial?.task_type ?? 'editing');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'normal');
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? 'todo');
  const [assignees, setAssignees] = useState<string[]>(initial?.assignees.map((a) => a.person?.id).filter((x): x is string => !!x) ?? []);
  const [dueDate, setDueDate] = useState<string | null>(initial?.due_at ? agencyDateKey(initial.due_at) : null);
  const [dueTime, setDueTime] = useState<string | null>(initial?.due_at ? agencyTimeKey(initial.due_at) : '17:00');
  const [startDate, setStartDate] = useState<string | null>(initial?.starts_at ? agencyDateKey(initial.starts_at) : null);
  const [startTime, setStartTime] = useState<string | null>(initial?.starts_at ? agencyTimeKey(initial.starts_at) : '09:00');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [checklist, setChecklist] = useState<ChecklistRow[]>(initial?.checklist.map((c) => ({ id: c.id, title: c.title, is_done: c.is_done })) ?? []);
  const [newItem, setNewItem] = useState('');
  const [dependsOn, setDependsOn] = useState<string[]>(initial?.dependencies.map((d) => d.id) ?? []);

  const options = useQuery({ queryKey: ['tasks', 'form-options', clientId], queryFn: () => fetchTaskFormOptions(clientId) });
  const staff = useQuery({ queryKey: ['team', 'directory'], queryFn: fetchTeamDirectory });
  const previousClient = useRef(clientId);
  useEffect(() => {
    if (previousClient.current !== clientId) {
      setProjectId(null);
      setContentId(null);
    }
    previousClient.current = clientId;
  }, [clientId]);

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = taskFormSchema.safeParse({
        client_id: clientId,
        project_id: projectId,
        content_id: contentId,
        title,
        description,
        task_type: type,
        priority,
        status: initial ? status : undefined,
        starts_at: startDate ? agencyDateTimeToIso(startDate, startTime ?? '09:00') : null,
        due_at: dueDate ? agencyDateTimeToIso(dueDate, dueTime ?? '18:00') : null,
        assignees,
        checklist,
        depends_on: dependsOn,
      });
      if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? 'Formani tekshiring');
      return saveTask(initial?.id ?? null, parsed.data);
    },
    onSuccess: (taskId) => {
      toast.show(initial ? 'Vazifa saqlandi' : 'Vazifa yaratildi va biriktirildi');
      ['tasks', 'home', 'dashboard', 'calendar'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      if (initial) router.back();
      else router.replace(`${base}/task/${taskId}` as Href);
    },
    onError: toast.error,
  });

  const addItem = () => {
    const t = newItem.trim();
    if (!t) return;
    setChecklist((c) => [...c, { title: t.slice(0, 200), is_done: false }]);
    setNewItem('');
  };

  return (
    <Screen edges={['bottom']}>
      <FormSection title="Vazifa">
        <TextField label="Nomi" value={title} onChangeText={setTitle} maxLength={200} placeholder="Masalan: SAFI Reel #3 — montaj" />
        <SelectField
          label="Turi"
          value={type}
          onChange={(v) => v && setType(v)}
          icon={TASK_TYPE[type].icon}
          options={Object.entries(TASK_TYPE).map(([k, v]) => ({ value: k as TaskType, label: v.label, icon: v.icon }))}
        />
        <SelectField label="Muhimlik" value={priority} onChange={(v) => v && setPriority(v)} icon="flag" options={Object.entries(PRIORITY).map(([k, v]) => ({ value: k as Priority, label: v.label }))} />
        {initial ? (
          <SelectField label="Holat" value={status} onChange={(v) => v && setStatus(v)} icon="activity" options={Object.entries(TASK_STATUS).map(([k, v]) => ({ value: k as TaskStatus, label: v.label }))} />
        ) : null}
        <SelectField
          label="Mas’ullar"
          required
          multiple
          value={assignees}
          onChange={setAssignees}
          icon="users"
          placeholder="Kim bajaradi?"
          options={(staff.data ?? []).map((p) => ({ value: p.user_id, label: p.full_name, description: p.job_title, avatar: { name: p.full_name, url: p.avatar_url } }))}
        />
      </FormSection>

      <FormSection title="Muddat">
        <View style={styles.row}>
          <View style={styles.wide}>
            <DateField label="Muddat sanasi" value={dueDate} onChange={setDueDate} allowClear />
          </View>
          <View style={styles.flex}>
            <TimeField label="Vaqt" value={dueTime} onChange={setDueTime} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.wide}>
            <DateField label="Boshlash (ixtiyoriy)" value={startDate} onChange={setStartDate} allowClear />
          </View>
          <View style={styles.flex}>
            <TimeField label="Vaqt" value={startTime} onChange={setStartTime} />
          </View>
        </View>
        <Text variant="caption" tone="tertiary">
          Mas’ulga muddatdan 2 soat va 30 daqiqa oldin eslatma boradi, muddat o‘tsa admin va owner ham xabar oladi.
        </Text>
      </FormSection>

      <FormSection title="Bog‘liqlik">
        {initial ? (
          <Text variant="bodyMedium">{initial.client?.name ?? 'Ichki vazifa'}</Text>
        ) : (
          <SelectField
            label="Mijoz"
            value={clientId}
            allowClear
            onChange={setClientId}
            icon="briefcase"
            placeholder="Ichki vazifa (mijozsiz)"
            options={(options.data?.clients ?? []).map((c) => ({ value: c.id, label: c.name, description: c.code }))}
          />
        )}
        {clientId ? (
          <>
            <SelectField label="Loyiha" value={projectId} allowClear onChange={setProjectId} icon="folder" placeholder="Loyihasiz" options={(options.data?.projects ?? []).map((p) => ({ value: p.id, label: p.name }))} />
            <SelectField
              label="Kontent"
              value={contentId}
              allowClear
              onChange={setContentId}
              icon="film"
              placeholder="Kontentsiz"
              options={(options.data?.content ?? []).map((c) => ({ value: c.id, label: c.title, description: `${CONTENT_TYPE[c.content_type].label} #${c.number}` }))}
            />
          </>
        ) : null}
        <SelectField
          label="Oldin bajarilishi kerak"
          multiple
          value={dependsOn}
          onChange={setDependsOn}
          icon="lock"
          placeholder="Bog‘liq vazifa yo‘q"
          options={(options.data?.tasks ?? []).filter((x) => x.id !== initial?.id).map((x) => ({ value: x.id, label: x.title, description: TASK_STATUS[x.status].label }))}
        />
      </FormSection>

      <FormSection title={`Checklist · ${checklist.length}`}>
        {checklist.map((c, i) => (
          <View key={`${c.id ?? 'new'}:${i}`} style={styles.item}>
            <Text variant="body" style={[styles.flex, c.is_done && styles.done]}>
              {i + 1}. {c.title}
            </Text>
            <IconButton icon="x" label="Olib tashlash" variant="plain" size={32} onPress={() => setChecklist((all) => all.filter((_, idx) => idx !== i))} />
          </View>
        ))}
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="Yangi band" value={newItem} onChangeText={setNewItem} onSubmitEditing={addItem} returnKeyType="done" placeholder="Masalan: Subtitr qo‘shish" />
          </View>
          <View style={styles.add}>
            <IconButton icon="plus" label="Band qo‘shish" onPress={addItem} size={44} />
          </View>
        </View>
      </FormSection>

      <FormSection title="Tavsif">
        <TextArea label="Nima qilish kerak" value={description} onChangeText={setDescription} maxLength={4000} minHeight={100} placeholder="Talablar, havolalar, natija qanday bo‘lishi kerak" />
      </FormSection>

      <Button title={initial ? 'Saqlash' : 'Vazifani yaratish'} loading={mutation.isPending} onPress={() => mutation.mutate()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' },
  wide: { flex: 1.6 },
  flex: { flex: 1 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  done: { textDecorationLine: 'line-through', opacity: 0.6 },
  add: { paddingBottom: 4 },
});
