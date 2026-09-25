import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  DateField,
  FormSection,
  QueryView,
  Screen,
  SegmentedControl,
  SelectField,
  Text,
  TextArea,
  TextField,
  TimeField,
  ToggleRow,
  useToast,
} from '@/components/ui';
import { CONTENT_STATUS, CONTENT_TYPE, PLATFORM, PRIORITY, TEAM_ROLE_LABEL } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { fetchTeamDirectory } from '@/features/team/api';
import { useInterfaceBase } from '@/lib/routes';
import { agencyDateKey, agencyDateTimeToIso, agencyTimeKey, formatShortDateTime } from '@/lib/time';
import {
  contentFormSchema,
  fetchContent,
  fetchFormOptions,
  saveContent,
  TEAM_ROLES,
  type ContentDetail,
  type ContentForm,
  type ContentStatus,
  type ContentType,
  type Platform,
  type Priority,
  type TeamRoleKey,
} from './api';

type ShootingMode = 'keep' | 'none' | 'existing' | 'new';
type DateTime = { date: string | null; time: string | null };

const ROLE_KEYS: Record<TeamRoleKey, string[]> = {
  operator: ['operator'],
  editor: ['editor'],
  designer: ['designer'],
  smm_manager: ['smm_manager'],
  copywriter: ['copywriter'],
};

const toParts = (iso: string | null | undefined): DateTime => (iso ? { date: agencyDateKey(iso), time: agencyTimeKey(iso) } : { date: null, time: null });
const toIso = (v: DateTime, fallbackTime = '18:00') => (v.date ? agencyDateTimeToIso(v.date, v.time ?? fallbackTime) : null);

export function ContentFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useQuery({ queryKey: ['content', 'detail', id], queryFn: () => fetchContent(id!), enabled: !!id });
  return (
    <>
      <Stack.Screen options={{ title: id ? 'Kontentni tahrirlash' : 'Yangi kontent' }} />
      {id ? <QueryView query={existing}>{(c) => <Form initial={c} />}</QueryView> : <Form initial={null} />}
    </>
  );
}

function Form({ initial }: { initial: ContentDetail | null }) {
  const toast = useToast();
  const router = useRouter();
  const base = useInterfaceBase();
  const queryClient = useQueryClient();
  const { clientId: presetClient, projectId: presetProject } = useLocalSearchParams<{ clientId?: string; projectId?: string }>();

  const [clientId, setClientId] = useState<string | null>(initial?.client_id ?? presetClient ?? null);
  const [projectId, setProjectId] = useState<string | null>(initial?.project_id ?? presetProject ?? null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [type, setType] = useState<ContentType>(initial?.content_type ?? 'reel');
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? 'normal');
  const [status, setStatus] = useState<ContentStatus>('idea');
  const [platforms, setPlatforms] = useState<Platform[]>(
    initial ? [...new Set(initial.publications.filter((p) => p.status !== 'cancelled').map((p) => p.platform))] : ['instagram'],
  );
  const [mode, setMode] = useState<ShootingMode>(initial ? 'keep' : 'none');
  const [shootingId, setShootingId] = useState<string | null>(initial?.shooting_id ?? null);
  const [shootDate, setShootDate] = useState<string | null>(null);
  const [shootStart, setShootStart] = useState<string | null>('10:00');
  const [shootEnd, setShootEnd] = useState<string | null>('13:00');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const [team, setTeam] = useState<Record<TeamRoleKey, string | null>>(() =>
    Object.fromEntries(TEAM_ROLES.map((r) => [r, initial?.team.find((t) => t.role === r)?.person?.id ?? null])) as Record<TeamRoleKey, string | null>,
  );
  const [due, setDue] = useState<DateTime>(toParts(initial?.due_at));
  const [approvalDue, setApprovalDue] = useState<DateTime>(toParts(initial?.client_approval_due_at));
  const [publish, setPublish] = useState<DateTime>(toParts(initial?.publications.find((p) => p.status !== 'cancelled' && p.scheduled_at)?.scheduled_at));
  const [script, setScript] = useState(initial?.script ?? '');
  const [caption, setCaption] = useState(initial?.caption ?? '');
  const [hashtags, setHashtags] = useState((initial?.hashtags ?? []).join(' '));
  const [music, setMusic] = useState(initial?.music_reference ?? '');
  const [refs, setRefs] = useState(
    (Array.isArray(initial?.reference_links) ? (initial!.reference_links as { url?: string }[]).map((r) => r?.url).filter(Boolean) : []).join('\n'),
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [clientVisible, setClientVisible] = useState(initial?.is_client_visible ?? true);
  const [countsToPlan, setCountsToPlan] = useState(initial?.counts_toward_plan ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const options = useQuery({ queryKey: ['content', 'form-options', clientId], queryFn: () => fetchFormOptions(clientId) });
  const staff = useQuery({ queryKey: ['team', 'directory'], queryFn: fetchTeamDirectory });

  // A project belongs to one client: changing the client clears the project (not on first render).
  const previousClient = useRef(clientId);
  useEffect(() => {
    if (previousClient.current !== clientId) setProjectId(null);
    previousClient.current = clientId;
  }, [clientId]);

  const staffFor = useMemo(
    () => (role: TeamRoleKey) =>
      (staff.data ?? [])
        .filter((p) => p.roles.some((r) => ROLE_KEYS[role].includes(r.key)))
        .map((p) => ({ value: p.user_id, label: p.full_name, description: p.job_title, avatar: { name: p.full_name, url: p.avatar_url } })),
    [staff.data],
  );

  const mutation = useMutation({
    mutationFn: (form: ContentForm) => saveContent(initial?.id ?? null, form),
    onSuccess: (savedId) => {
      toast.show(initial ? 'Kontent saqlandi' : 'Kontent yaratildi');
      ['content', 'home', 'calendar', 'dashboard', 'shootings'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      if (initial) router.back();
      else router.replace(`${base}/content/${savedId}` as Href);
    },
    onError: toast.error,
  });

  const submit = () => {
    const shooting =
      mode === 'existing'
        ? { mode, shooting_id: shootingId ?? '' }
        : mode === 'new'
          ? {
              mode,
              starts_at: shootDate ? agencyDateTimeToIso(shootDate, shootStart ?? '10:00') : '',
              ends_at: shootDate ? agencyDateTimeToIso(shootDate, shootEnd ?? shootStart ?? '12:00') : '',
              location_name: location,
              location_address: address,
            }
          : { mode };
    if (mode === 'new' && !shootDate) return setErrors({ shooting: 'Syomka sanasini tanlang' });
    if (mode === 'new' && shootEnd && shootStart && shootEnd <= shootStart) return setErrors({ shooting: 'Syomka tugashi boshlanishidan keyin bo‘lsin' });

    const parsed = contentFormSchema.safeParse({
      client_id: clientId ?? '',
      project_id: projectId,
      title,
      content_type: type,
      priority,
      status: initial ? undefined : status,
      platforms,
      description,
      script,
      caption,
      hashtags: hashtags.split(/[\s,]+/).map((h) => h.trim()).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`)),
      music_reference: music,
      reference_links: refs.split(/\n+/).map((r) => r.trim()).filter(Boolean),
      due_at: toIso(due),
      client_approval_due_at: toIso(approvalDue),
      publish_at: toIso(publish, '19:00'),
      is_client_visible: clientVisible,
      counts_toward_plan: countsToPlan,
      team,
      shooting,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (next[String(i.path[0])] ??= i.message));
      setErrors(next);
      toast.show(Object.values(next)[0] ?? 'Formani tekshiring', 'error');
      return;
    }
    setErrors({});
    mutation.mutate(parsed.data);
  };

  return (
    <Screen edges={['bottom']}>
      <FormSection title="Asosiy">
        {!initial ? (
          <SelectField
            label="Mijoz"
            required
            value={clientId}
            onChange={setClientId}
            icon="briefcase"
            error={errors.client_id}
            options={(options.data?.clients ?? []).map((c) => ({ value: c.id, label: c.name, description: c.code }))}
          />
        ) : (
          <Text variant="bodyMedium">{initial.client?.name}</Text>
        )}
        {clientId ? (
          <SelectField
            label="Loyiha"
            value={projectId}
            allowClear
            onChange={setProjectId}
            icon="folder"
            placeholder="Loyihasiz"
            options={(options.data?.projects ?? []).map((p) => ({ value: p.id, label: p.name }))}
          />
        ) : null}
        <TextField label="Sarlavha" value={title} onChangeText={setTitle} maxLength={200} error={errors.title} placeholder="Masalan: 5 ta eng qimmat tovuq taomi" />
        <SelectField
          label="Kontent turi"
          value={type}
          onChange={(v) => v && setType(v)}
          icon={CONTENT_TYPE[type].icon}
          options={Object.entries(CONTENT_TYPE).map(([k, v]) => ({ value: k as ContentType, label: v.label, icon: v.icon }))}
        />
        <SelectField
          label="Platformalar"
          multiple
          value={platforms}
          onChange={setPlatforms}
          icon="share-2"
          options={Object.entries(PLATFORM).map(([k, v]) => ({ value: k as Platform, label: v.label, icon: v.icon }))}
        />
        <SelectField
          label="Muhimlik"
          value={priority}
          onChange={(v) => v && setPriority(v)}
          icon="flag"
          options={Object.entries(PRIORITY).map(([k, v]) => ({ value: k as Priority, label: v.label }))}
        />
        {!initial ? (
          <SelectField
            label="Boshlang‘ich holat"
            value={status}
            onChange={(v) => v && setStatus(v)}
            icon="git-commit"
            options={(['idea', 'script', 'ready_for_shoot'] as ContentStatus[]).map((s) => ({ value: s, label: CONTENT_STATUS[s].label, icon: CONTENT_STATUS[s].icon }))}
          />
        ) : null}
      </FormSection>

      <FormSection title="Syomka">
        <SegmentedControl<ShootingMode>
          options={[
            ...(initial ? [{ value: 'keep' as const, label: 'O‘zgarishsiz' }] : []),
            { value: 'none', label: 'Syomkasiz' },
            { value: 'existing', label: 'Mavjud' },
            { value: 'new', label: 'Yangi' },
          ]}
          value={mode}
          onChange={setMode}
        />
        {mode === 'keep' && initial?.shooting ? (
          <Text variant="caption" tone="secondary">
            {initial.shooting.title} · {formatShortDateTime(initial.shooting.starts_at)}
          </Text>
        ) : null}
        {mode === 'existing' ? (
          <SelectField
            label="Syomka"
            value={shootingId}
            onChange={setShootingId}
            icon="video"
            error={errors.shooting}
            placeholder={clientId ? 'Syomkani tanlang' : 'Avval mijozni tanlang'}
            options={(options.data?.shootings ?? []).map((s) => ({ value: s.id, label: s.title, description: `${formatShortDateTime(s.starts_at)}${s.location_name ? ` · ${s.location_name}` : ''}` }))}
          />
        ) : null}
        {mode === 'new' ? (
          <>
            <DateField label="Syomka sanasi" value={shootDate} onChange={setShootDate} error={errors.shooting} required />
            <View style={styles.row}>
              <View style={styles.flex}>
                <TimeField label="Boshlanishi" value={shootStart} onChange={setShootStart} />
              </View>
              <View style={styles.flex}>
                <TimeField label="Tugashi" value={shootEnd} onChange={setShootEnd} />
              </View>
            </View>
            <TextField label="Lokatsiya" value={location} onChangeText={setLocation} maxLength={200} placeholder="SAFI Yunusobod filiali" />
            <TextField label="Manzil" value={address} onChangeText={setAddress} maxLength={300} placeholder="Toshkent, Yunusobod tumani" />
          </>
        ) : null}
      </FormSection>

      <FormSection title="Jamoa">
        {TEAM_ROLES.map((role) => (
          <SelectField
            key={role}
            label={TEAM_ROLE_LABEL[role]}
            value={team[role]}
            allowClear
            onChange={(v) => setTeam((t) => ({ ...t, [role]: v }))}
            icon="user"
            placeholder="Biriktirilmagan"
            options={staffFor(role)}
          />
        ))}
      </FormSection>

      <FormSection title="Muddatlar">
        <DateTimeRow label="Montaj muddati" value={due} onChange={setDue} />
        <DateTimeRow label="Mijoz tasdig‘i" value={approvalDue} onChange={setApprovalDue} />
        <DateTimeRow label="Nashr" value={publish} onChange={setPublish} />
      </FormSection>

      <FormSection title="Ssenariy va matn">
        <TextArea label="Ssenariy" value={script} onChangeText={setScript} maxLength={20000} minHeight={140} />
        <TextArea label="Caption" value={caption} onChangeText={setCaption} maxLength={4000} minHeight={90} />
        <TextField label="Hashtaglar" value={hashtags} onChangeText={setHashtags} autoCapitalize="none" error={errors.hashtags} placeholder="#safi #tashkentfood" />
        <TextField label="Musiqa referensi" value={music} onChangeText={setMusic} maxLength={500} />
        <TextArea label="Referens havolalar" value={refs} onChangeText={setRefs} minHeight={70} error={errors.reference_links} hint="Har bir havola yangi qatorda, https:// bilan" autoCapitalize="none" />
        <TextArea label="Tavsif / izoh" value={description} onChangeText={setDescription} maxLength={4000} minHeight={80} />
      </FormSection>

      <FormSection title="Sozlamalar">
        <ToggleRow label="Mijozga ko‘rinadi" description="O‘chirilsa, kontent faqat SUN MEDIA ichida qoladi." value={clientVisible} onChange={setClientVisible} />
        <ToggleRow label="Tarif hisobiga kiradi" description="Mijoz paketidagi limitdan sanaladi." value={countsToPlan} onChange={setCountsToPlan} />
      </FormSection>

      <Button title={initial ? 'Saqlash' : 'Kontentni yaratish'} loading={mutation.isPending} onPress={submit} />
    </Screen>
  );
}

function DateTimeRow({ label, value, onChange }: { label: string; value: DateTime; onChange: (v: DateTime) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.flexWide}>
        <DateField label={label} value={value.date} onChange={(date) => onChange({ ...value, date })} allowClear placeholder="Sana" />
      </View>
      <View style={styles.flex}>
        <TimeField label="Vaqt" value={value.time} onChange={(time) => onChange({ ...value, time })} placeholder="--:--" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  flexWide: { flex: 1.6 },
});
