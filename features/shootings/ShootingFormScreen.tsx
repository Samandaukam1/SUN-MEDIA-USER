import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, DateField, FormSection, IconButton, QueryView, Screen, SelectField, Text, TextArea, TextField, TimeField, useToast } from '@/components/ui';
import { SHOOTING_STATUS, TEAM_ROLE_LABEL } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { fetchFormOptions } from '@/features/studio/api';
import { fetchTeamDirectory } from '@/features/team/api';
import { UserFacingError } from '@/lib/errors';
import { useInterfaceBase } from '@/lib/routes';
import { agencyDateKey, agencyDateTimeToIso, agencyTimeKey } from '@/lib/time';
import type { Database } from '@/types/database';
import { fetchShooting, saveShooting, shootingFormSchema, type ShootingDetail, type ShootingStatus, type ShotItem } from './api';

type TeamRole = Database['public']['Enums']['team_role'];
type CrewMember = { user_id: string; role: TeamRole };

const crewRole = (keys: string[]): TeamRole =>
  keys.includes('operator') ? 'operator' : keys.includes('editor') ? 'editor' : keys.includes('designer') ? 'designer' : keys.includes('smm_manager') ? 'smm_manager' : keys.includes('copywriter') ? 'copywriter' : keys.includes('project_manager') ? 'project_manager' : 'assistant';

export function ShootingFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useQuery({ queryKey: ['shootings', 'detail', id], queryFn: () => fetchShooting(id!), enabled: !!id });
  return (
    <>
      <Stack.Screen options={{ title: id ? 'Syomkani tahrirlash' : 'Yangi syomka' }} />
      {id ? <QueryView query={existing}>{(s) => <Form initial={s} />}</QueryView> : <Form initial={null} />}
    </>
  );
}

function Form({ initial }: { initial: ShootingDetail | null }) {
  const toast = useToast();
  const router = useRouter();
  const base = useInterfaceBase();
  const queryClient = useQueryClient();
  const { clientId: presetClient } = useLocalSearchParams<{ clientId?: string }>();
  const [clientId, setClientId] = useState<string | null>(initial?.client_id ?? presetClient ?? null);
  const [projectId, setProjectId] = useState<string | null>(initial?.project_id ?? null);
  const [title, setTitle] = useState(initial?.title ?? '');
  const [date, setDate] = useState<string | null>(initial ? agencyDateKey(initial.starts_at) : null);
  const [start, setStart] = useState<string | null>(initial ? agencyTimeKey(initial.starts_at) : '10:00');
  const [end, setEnd] = useState<string | null>(initial ? agencyTimeKey(initial.ends_at) : '13:00');
  const [locationName, setLocationName] = useState(initial?.location_name ?? '');
  const [address, setAddress] = useState(initial?.location_address ?? '');
  const [mapUrl, setMapUrl] = useState(initial?.location_url ?? '');
  const [managerId, setManagerId] = useState<string | null>(initial?.manager?.id ?? null);
  const [status, setStatus] = useState<ShootingStatus>((initial?.status as ShootingStatus) ?? 'planned');
  const [crew, setCrew] = useState<CrewMember[]>(initial?.crew.filter((c) => c.person).map((c) => ({ user_id: c.person!.id, role: c.role as TeamRole })) ?? []);
  const [shots, setShots] = useState<ShotItem[]>(initial?.shotList ?? []);
  const [newShot, setNewShot] = useState('');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const options = useQuery({ queryKey: ['content', 'form-options', clientId], queryFn: () => fetchFormOptions(clientId) });
  const staff = useQuery({ queryKey: ['team', 'directory'], queryFn: fetchTeamDirectory });
  const byId = new Map((staff.data ?? []).map((p) => [p.user_id, p]));
  const previousClient = useRef(clientId);
  useEffect(() => {
    if (previousClient.current !== clientId) setProjectId(null);
    previousClient.current = clientId;
  }, [clientId]);

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = shootingFormSchema.safeParse({
        client_id: clientId ?? '',
        project_id: projectId,
        title,
        description,
        starts_at: date && start ? agencyDateTimeToIso(date, start) : '',
        ends_at: date && end ? agencyDateTimeToIso(date, end) : '',
        location_name: locationName,
        location_address: address,
        location_url: mapUrl.trim(),
        responsible_manager_id: managerId,
        status,
        shot_list: shots,
        crew,
      });
      if (!parsed.success) {
        const next: Record<string, string> = {};
        parsed.error.issues.forEach((i) => (next[String(i.path[0])] ??= i.message));
        setErrors(next);
        throw new UserFacingError(Object.values(next)[0] ?? 'Formani tekshiring');
      }
      setErrors({});
      return saveShooting(initial?.id ?? null, parsed.data);
    },
    onSuccess: (savedId) => {
      toast.show(initial ? 'Syomka saqlandi' : 'Syomka rejalashtirildi');
      ['shootings', 'calendar', 'home', 'dashboard', 'content'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      if (initial) router.back();
      else router.replace(`${base}/shooting/${savedId}` as Href);
    },
    onError: toast.error,
  });

  const addShot = () => {
    const t = newShot.trim();
    if (!t) return;
    setShots((s) => [...s, { title: t.slice(0, 200), done: false }]);
    setNewShot('');
  };

  return (
    <Screen edges={['bottom']}>
      <FormSection title="Syomka">
        {initial ? (
          <Text variant="bodyMedium">{initial.client?.name}</Text>
        ) : (
          <SelectField
            label="Mijoz"
            required
            value={clientId}
            onChange={setClientId}
            icon="briefcase"
            error={errors.client_id}
            options={(options.data?.clients ?? []).map((c) => ({ value: c.id, label: c.name, description: c.code }))}
          />
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
        <TextField label="Nomi" value={title} onChangeText={setTitle} maxLength={200} error={errors.title} placeholder="Masalan: SAFI Chilonzor syomkasi" />
        <DateField label="Sana" value={date} onChange={setDate} required error={errors.starts_at} />
        <View style={styles.row}>
          <View style={styles.flex}>
            <TimeField label="Boshlanishi" value={start} onChange={setStart} />
          </View>
          <View style={styles.flex}>
            <TimeField label="Tugashi" value={end} onChange={setEnd} error={errors.ends_at} />
          </View>
        </View>
        {initial ? (
          <SelectField
            label="Holat"
            value={status}
            onChange={(v) => v && setStatus(v)}
            icon="activity"
            options={Object.entries(SHOOTING_STATUS).map(([k, v]) => ({ value: k as ShootingStatus, label: v.label }))}
          />
        ) : null}
      </FormSection>

      <FormSection title="Lokatsiya">
        <TextField label="Joy nomi" value={locationName} onChangeText={setLocationName} maxLength={200} placeholder="SAFI Chilonzor filiali" />
        <TextField label="Manzil" value={address} onChangeText={setAddress} maxLength={300} placeholder="Toshkent, Chilonzor tumani, …" />
        <TextField label="Xarita havolasi" value={mapUrl} onChangeText={setMapUrl} autoCapitalize="none" keyboardType="url" error={errors.location_url} placeholder="https://maps.google.com/…" />
      </FormSection>

      <FormSection title={`Jamoa · ${crew.length}`}>
        <SelectField
          label="Mas’ul menejer"
          value={managerId}
          allowClear
          onChange={setManagerId}
          icon="user-check"
          placeholder="Men"
          options={(staff.data ?? [])
            .filter((p) => p.roles.some((r) => ['owner', 'director', 'admin', 'project_manager', 'smm_manager'].includes(r.key)))
            .map((p) => ({ value: p.user_id, label: p.full_name, description: p.job_title, avatar: { name: p.full_name, url: p.avatar_url } }))}
        />
        <SelectField
          label="Syomkaga boradiganlar"
          multiple
          value={crew.map((c) => c.user_id)}
          onChange={(ids) => setCrew((current) => ids.map((uid) => current.find((c) => c.user_id === uid) ?? { user_id: uid, role: crewRole(byId.get(uid)?.roles.map((r) => r.key) ?? []) }))}
          icon="users"
          placeholder="Operator, montajyor, SMM…"
          options={(staff.data ?? []).map((p) => ({ value: p.user_id, label: p.full_name, description: p.job_title, avatar: { name: p.full_name, url: p.avatar_url } }))}
        />
        {crew.map((c) => {
          const person = byId.get(c.user_id);
          return (
            <View key={c.user_id} style={styles.member}>
              <Avatar name={person?.full_name} url={person?.avatar_url} size={32} />
              <View style={styles.flex}>
                <SelectField
                  label={person?.full_name ?? 'Xodim'}
                  value={c.role}
                  onChange={(role) => role && setCrew((all) => all.map((x) => (x.user_id === c.user_id ? { ...x, role } : x)))}
                  icon="briefcase"
                  options={Object.entries(TEAM_ROLE_LABEL).map(([k, label]) => ({ value: k as TeamRole, label }))}
                />
              </View>
              <IconButton icon="x" label="Olib tashlash" variant="plain" size={36} onPress={() => setCrew((all) => all.filter((x) => x.user_id !== c.user_id))} />
            </View>
          );
        })}
      </FormSection>

      <FormSection title={`Shot list · ${shots.length}`}>
        {shots.map((shot, i) => (
          <View key={`${i}:${shot.title}`} style={styles.shot}>
            <Text variant="body" style={styles.flex}>
              {i + 1}. {shot.title}
            </Text>
            <IconButton icon="x" label="Kadrni olib tashlash" variant="plain" size={32} onPress={() => setShots((s) => s.filter((_, idx) => idx !== i))} />
          </View>
        ))}
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label="Yangi kadr" value={newShot} onChangeText={setNewShot} onSubmitEditing={addShot} returnKeyType="done" placeholder="Masalan: Taom yaqin plan" />
          </View>
          <View style={styles.addBtn}>
            <IconButton icon="plus" label="Kadr qo‘shish" onPress={addShot} size={44} />
          </View>
        </View>
      </FormSection>

      <FormSection title="Izoh">
        <TextArea label="Syomka bo‘yicha izoh" value={description} onChangeText={setDescription} maxLength={4000} minHeight={90} placeholder="Kiyim, rekvizit, mijoz bilan kelishuvlar…" />
      </FormSection>

      <Button title={initial ? 'Saqlash' : 'Syomkani rejalashtirish'} loading={mutation.isPending} onPress={() => mutation.mutate()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' },
  flex: { flex: 1 },
  member: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  shot: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addBtn: { paddingBottom: 4 },
});
