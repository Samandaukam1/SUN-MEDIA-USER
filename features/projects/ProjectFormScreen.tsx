import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, DateField, FormSection, IconButton, QueryView, Screen, SelectField, Text, TextArea, TextField, useToast } from '@/components/ui';
import { PROJECT_KIND, PROJECT_STATUS, TEAM_ROLE_LABEL } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { fetchFormOptions } from '@/features/studio/api';
import { fetchTeamDirectory } from '@/features/team/api';
import { UserFacingError } from '@/lib/errors';
import { useInterfaceBase } from '@/lib/routes';
import type { Database } from '@/types/database';
import { fetchProject, projectSchema, saveProject, type ProjectDetail, type ProjectKind, type ProjectStatus } from './api';

type TeamRole = Database['public']['Enums']['team_role'];
type Member = { user_id: string; team_role: TeamRole };

/** Default project role from the person's staff role. */
function defaultTeamRole(roleKeys: string[]): TeamRole {
  if (roleKeys.includes('project_manager')) return 'project_manager';
  if (roleKeys.includes('smm_manager')) return 'smm_manager';
  if (roleKeys.includes('operator')) return 'operator';
  if (roleKeys.includes('editor')) return 'editor';
  if (roleKeys.includes('designer')) return 'designer';
  if (roleKeys.includes('copywriter')) return 'copywriter';
  return 'account_manager';
}

export function ProjectFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useQuery({ queryKey: ['projects', 'detail', id], queryFn: () => fetchProject(id!), enabled: !!id });
  return (
    <>
      <Stack.Screen options={{ title: id ? 'Loyihani tahrirlash' : 'Yangi loyiha' }} />
      {id ? <QueryView query={existing}>{(p) => <Form initial={p} />}</QueryView> : <Form initial={null} />}
    </>
  );
}

function Form({ initial }: { initial: ProjectDetail | null }) {
  const toast = useToast();
  const router = useRouter();
  const base = useInterfaceBase();
  const queryClient = useQueryClient();
  const [clientId, setClientId] = useState<string | null>(initial?.client_id ?? null);
  const [name, setName] = useState(initial?.name ?? '');
  const [kind, setKind] = useState<ProjectKind>(initial?.kind ?? 'retainer');
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? 'active');
  const [startsOn, setStartsOn] = useState<string | null>(initial?.starts_on ?? null);
  const [endsOn, setEndsOn] = useState<string | null>(initial?.ends_on ?? null);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [members, setMembers] = useState<Member[]>(
    initial?.members.filter((m) => m.person).map((m) => ({ user_id: m.person!.id, team_role: m.team_role as TeamRole })) ?? [],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const options = useQuery({ queryKey: ['content', 'form-options', null], queryFn: () => fetchFormOptions(null) });
  const staff = useQuery({ queryKey: ['team', 'directory'], queryFn: fetchTeamDirectory });
  const byId = new Map((staff.data ?? []).map((p) => [p.user_id, p]));

  const mutation = useMutation({
    mutationFn: () => {
      const parsed = projectSchema.safeParse({
        client_id: clientId ?? '',
        name,
        description: description.trim() || null,
        kind,
        status,
        starts_on: startsOn,
        ends_on: endsOn,
        members,
      });
      if (!parsed.success) {
        const next: Record<string, string> = {};
        parsed.error.issues.forEach((i) => (next[String(i.path[0])] ??= i.message));
        setErrors(next);
        throw new UserFacingError(Object.values(next)[0] ?? 'Formani tekshiring');
      }
      setErrors({});
      return saveProject(initial?.id ?? null, parsed.data);
    },
    onSuccess: (projectId) => {
      toast.show(initial ? 'Loyiha saqlandi' : 'Loyiha yaratildi');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (initial) router.back();
      else router.replace(`${base}/projects/${projectId}` as Href);
    },
    onError: toast.error,
  });

  return (
    <Screen edges={['bottom']}>
      <FormSection title="Loyiha">
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
        <TextField label="Loyiha nomi" value={name} onChangeText={setName} maxLength={160} error={errors.name} placeholder="Masalan: SAFI — oktabr kontent rejasi" />
        <SelectField
          label="Turi"
          value={kind}
          onChange={(v) => v && setKind(v)}
          icon="layers"
          options={Object.entries(PROJECT_KIND).map(([k, label]) => ({ value: k as ProjectKind, label }))}
        />
        <SelectField
          label="Holat"
          value={status}
          onChange={(v) => v && setStatus(v)}
          icon="activity"
          options={Object.entries(PROJECT_STATUS).map(([k, v]) => ({ value: k as ProjectStatus, label: v.label }))}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <DateField label="Boshlanishi" value={startsOn} onChange={setStartsOn} allowClear />
          </View>
          <View style={styles.flex}>
            <DateField label="Tugashi" value={endsOn} onChange={setEndsOn} allowClear error={errors.ends_on} />
          </View>
        </View>
        <TextArea label="Tavsif" value={description} onChangeText={setDescription} maxLength={10000} minHeight={90} placeholder="Maqsad, KPI, muhim eslatmalar" />
      </FormSection>

      <FormSection title={`Jamoa · ${members.length}`}>
        <SelectField
          label="Xodim qo‘shish"
          multiple
          value={members.map((m) => m.user_id)}
          onChange={(ids) =>
            setMembers((current) =>
              ids.map((userId) => current.find((m) => m.user_id === userId) ?? { user_id: userId, team_role: defaultTeamRole(byId.get(userId)?.roles.map((r) => r.key) ?? []) }),
            )
          }
          icon="users"
          placeholder="Xodimlarni tanlang"
          options={(staff.data ?? []).map((p) => ({ value: p.user_id, label: p.full_name, description: p.job_title, avatar: { name: p.full_name, url: p.avatar_url } }))}
        />
        {members.map((m) => {
          const person = byId.get(m.user_id);
          return (
            <View key={m.user_id} style={styles.member}>
              <Avatar name={person?.full_name} url={person?.avatar_url} size={32} />
              <View style={styles.flex}>
                <SelectField
                  label={person?.full_name ?? 'Xodim'}
                  value={m.team_role}
                  onChange={(role) => role && setMembers((all) => all.map((x) => (x.user_id === m.user_id ? { ...x, team_role: role } : x)))}
                  icon="briefcase"
                  options={Object.entries(TEAM_ROLE_LABEL).map(([k, label]) => ({ value: k as TeamRole, label }))}
                />
              </View>
              <IconButton icon="x" label="Jamoadan chiqarish" variant="plain" size={36} onPress={() => setMembers((all) => all.filter((x) => x.user_id !== m.user_id))} />
            </View>
          );
        })}
      </FormSection>

      <Button title={initial ? 'Saqlash' : 'Loyihani yaratish'} loading={mutation.isPending} onPress={() => mutation.mutate()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  member: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
});
