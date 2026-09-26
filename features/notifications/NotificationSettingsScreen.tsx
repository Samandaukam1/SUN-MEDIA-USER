import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { Badge, Button, Card, Icon, QueryView, Screen, Section, Text, useToast, type IconName } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { getSupabase } from '@/lib/supabase';
import { enablePush, getPushState, type PushState } from './push';

type Group = { key: string; label: string; hint: string; icon: IconName; types: string[]; staffOnly?: boolean; clientOnly?: boolean };

// Each switch covers every event type of its group (preferences are stored per type).
const GROUPS: Group[] = [
  { key: 'tasks', label: 'Vazifalar', hint: 'Yangi vazifa, izoh, bajarildi', icon: 'check-square', types: ['task.assigned', 'task.comment', 'task.completed'], staffOnly: true },
  { key: 'deadlines', label: 'Muddatlar', hint: 'Muddat yaqinlashdi, o‘tib ketdi', icon: 'clock', types: ['deadline.approaching', 'deadline.overdue', 'deadline.approval'] },
  {
    key: 'approvals',
    label: 'Tasdiqlash',
    hint: 'Yangi versiya, tasdiq va o‘zgartirish so‘rovlari',
    icon: 'check-circle',
    types: ['approval.requested', 'approval.internal_requested', 'approval.approved', 'approval.changes_requested'],
  },
  { key: 'content', label: 'Kontent', hint: 'Biriktirildi, joylandi', icon: 'film', types: ['content.assigned', 'content.published'] },
  { key: 'shootings', label: 'Syomkalar', hint: 'Syomkaga qo‘shildingiz, ertangi eslatma', icon: 'video', types: ['shooting.assigned', 'shooting.reminder'] },
  { key: 'chat', label: 'Chat', hint: 'Yangi xabarlar', icon: 'message-circle', types: ['chat.message'] },
  { key: 'announcements', label: 'E’lonlar', hint: 'Kompaniya yangiliklari', icon: 'volume-2', types: ['announcement'], staffOnly: true },
  {
    key: 'plan',
    label: 'Tarif va hisobotlar',
    hint: 'Tarif so‘rovlari, oylik hisobot',
    icon: 'credit-card',
    types: ['plan.upgrade_requested', 'plan.upgrade_approved', 'plan.upgrade_rejected', 'report.published'],
  },
];

type Pref = { type: string; push_enabled: boolean; in_app_enabled: boolean };

async function fetchPrefs(userId: string): Promise<Pref[]> {
  const { data, error } = await getSupabase().from('notification_preferences').select('type, push_enabled, in_app_enabled').eq('user_id', userId);
  if (error) throw error;
  return data;
}

async function savePrefs(userId: string, group: Group, change: Partial<Pick<Pref, 'push_enabled' | 'in_app_enabled'>>, current: Pref[]) {
  const rows = group.types.map((type) => {
    const existing = current.find((p) => p.type === type);
    return {
      user_id: userId,
      type,
      push_enabled: change.push_enabled ?? existing?.push_enabled ?? true,
      in_app_enabled: change.in_app_enabled ?? existing?.in_app_enabled ?? true,
    };
  });
  const { error } = await getSupabase().from('notification_preferences').upsert(rows, { onConflict: 'user_id,type' });
  if (error) throw error;
}

export function NotificationSettingsScreen() {
  const me = useMe();
  const toast = useToast();
  const queryClient = useQueryClient();
  const push = useQuery({ queryKey: ['notifications', 'push-state'], queryFn: getPushState });
  const prefs = useQuery({ queryKey: ['notifications', 'prefs', me.userId], queryFn: () => fetchPrefs(me.userId) });
  const { colors } = useTheme();
  const isStaff = me.kind === 'staff';
  const groups = GROUPS.filter((g) => (isStaff ? !g.clientOnly : !g.staffOnly));

  const enable = useMutation({
    mutationFn: enablePush,
    onSuccess: (state) => {
      queryClient.setQueryData(['notifications', 'push-state'], state);
      if (state === 'granted') toast.show('Push bildirishnomalar yoqildi');
    },
    onError: toast.error,
  });
  const save = useMutation({
    mutationFn: ({ group, change }: { group: Group; change: Partial<Pick<Pref, 'push_enabled' | 'in_app_enabled'>> }) =>
      savePrefs(me.userId, group, change, prefs.data ?? []),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', 'prefs'] }),
    onError: toast.error,
  });

  const groupState = (g: Group) => {
    const rows = prefs.data ?? [];
    const pushOn = g.types.every((t) => rows.find((p) => p.type === t)?.push_enabled ?? true);
    const appOn = g.types.every((t) => rows.find((p) => p.type === t)?.in_app_enabled ?? true);
    return { pushOn, appOn };
  };

  return (
    <Screen edges={[]} refreshing={push.isRefetching || prefs.isRefetching} onRefresh={() => Promise.all([push.refetch(), prefs.refetch()])}>
      <Stack.Screen options={{ title: 'Bildirishnomalar' }} />
      <PushCard state={push.data} busy={enable.isPending} onEnable={() => enable.mutate()} />
      <QueryView query={prefs}>
        {() => (
          <Section title="Nimalar haqida xabar berilsin">
            {groups.map((g) => {
              const { pushOn, appOn } = groupState(g);
              return (
                <Card key={g.key} style={styles.group}>
                  <View style={styles.groupHead}>
                    <Icon name={g.icon} size={18} color={colors.text} />
                    <View style={styles.flex}>
                      <Text variant="subheading">{g.label}</Text>
                      <Text variant="caption" tone="secondary">
                        {g.hint}
                      </Text>
                    </View>
                  </View>
                  <SwitchLine
                    label="Ilova ichida"
                    value={appOn}
                    onChange={(v) => save.mutate({ group: g, change: { in_app_enabled: v, ...(v ? {} : { push_enabled: false }) } })}
                  />
                  <SwitchLine label="Push (telefonga)" value={pushOn && appOn} disabled={!appOn} onChange={(v) => save.mutate({ group: g, change: { push_enabled: v } })} />
                </Card>
              );
            })}
          </Section>
        )}
      </QueryView>
      <Text variant="caption" tone="tertiary">
        Ovozsiz qilingan chatlardan xabar kelmaydi. Muhim muddat eslatmalarini o‘chirib qo‘ymaslikni tavsiya qilamiz.
      </Text>
    </Screen>
  );
}

function SwitchLine({ label, value, disabled, onChange }: { label: string; value: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.switchLine, { borderTopColor: colors.border }]}>
      <Text variant="body" tone={disabled ? 'tertiary' : 'primary'} style={styles.flex}>
        {label}
      </Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ true: colors.brand, false: colors.borderStrong }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.borderStrong}
      />
    </View>
  );
}

function PushCard({ state, busy, onEnable }: { state: PushState | undefined; busy: boolean; onEnable: () => void }) {
  const { colors } = useTheme();
  if (!state) return null;
  const view: Record<PushState, { title: string; text: string; tone: 'success' | 'warning' | 'neutral' | 'danger'; action?: { label: string; run: () => void } }> = {
    granted: { title: 'Push yoqilgan', text: 'Bu telefon muhim voqealar haqida darhol xabar oladi.', tone: 'success' },
    undetermined: {
      title: 'Push o‘chiq',
      text: 'Muddat, tasdiq va syomkalarni o‘tkazib yubormaslik uchun push bildirishnomalarni yoqing.',
      tone: 'warning',
      action: { label: 'Push bildirishnomalarni yoqish', run: onEnable },
    },
    denied: {
      title: 'Ruxsat berilmagan',
      text: 'Push uchun iPhone sozlamalarida SUN MEDIA ga bildirishnoma ruxsatini bering.',
      tone: 'danger',
      action: { label: 'Sozlamalarni ochish', run: () => Linking.openSettings() },
    },
    unconfigured: {
      title: 'Push bu versiyada sozlanmagan',
      text: 'Ilova ichidagi bildirishnomalar ishlaydi. Push uchun ilova EAS loyihasi bilan qurilishi kerak (administrator sozlaydi).',
      tone: 'neutral',
    },
    unsupported: { title: 'Push mavjud emas', text: 'Bu qurilmada push bildirishnomalar qo‘llab-quvvatlanmaydi.', tone: 'neutral' },
  };
  const v = view[state];
  return (
    <Card style={styles.push}>
      <View style={styles.groupHead}>
        <Icon name={state === 'granted' ? 'bell' : 'bell-off'} size={20} color={colors.text} />
        <Text variant="heading" style={styles.flex}>
          {v.title}
        </Text>
        <Badge label={state === 'granted' ? 'Faol' : state === 'denied' ? 'Bloklangan' : state === 'undetermined' ? 'O‘chiq' : '—'} tone={v.tone} />
      </View>
      <Text variant="body" tone="secondary">
        {v.text}
      </Text>
      {v.action ? <Button title={v.action.label} icon="bell" loading={busy} onPress={v.action.run} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: spacing.xs },
  switchLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  push: { gap: spacing.md },
});
