import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, EmptyState, HeaderButton, Icon, ItemRow, KeyValue, QueryView, Screen, Section, Sheet, Text, TextArea, TimeField, useToast } from '@/components/ui';
import { CONTENT_STATUS, CONTENT_TYPE, SHOOTING_ATTENDANCE_STATUS, SHOOTING_STATUS, TEAM_ROLE_LABEL } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useAuth, useMe } from '@/features/auth/AuthProvider';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import { agencyDateKey, agencyDateTimeToIso, agencyTimeKey, formatDateKeyLong, formatTime } from '@/lib/time';
import type { Database } from '@/types/database';
import { fetchShooting, markShootingAttendance, toggleShot, updateShootingStatus, type ShootingAttendanceStatus, type ShootingDetail, type ShootingStatus } from './api';

type Enums = Database['public']['Enums'];

const NEXT_STATUS: Partial<Record<ShootingStatus, { status: ShootingStatus; label: string; icon: 'check' | 'play' | 'flag' }[]>> = {
  planned: [{ status: 'confirmed', label: 'Tasdiqlash', icon: 'check' }],
  confirmed: [{ status: 'in_progress', label: 'Syomkani boshlash', icon: 'play' }],
  in_progress: [{ status: 'completed', label: 'Yakunlash', icon: 'flag' }],
  postponed: [{ status: 'confirmed', label: 'Qayta tasdiqlash', icon: 'check' }],
};

export function ShootingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { can } = useAuth();
  const nav = useNav();
  const query = useQuery({ queryKey: ['shootings', 'detail', id], queryFn: () => fetchShooting(id), enabled: !!id });
  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen
        options={{
          title: query.data ? `${query.data.client?.code ?? ''} syomkasi` : 'Syomka',
          headerRight: can('shootings.manage') && query.data ? () => <HeaderButton icon="edit-2" label="Tahrirlash" onPress={() => nav.go(`/shooting/edit/${id}`)} /> : undefined,
        }}
      />
      <QueryView query={query}>{(s) => <Body s={s} />}</QueryView>
    </Screen>
  );
}

function Body({ s }: { s: ShootingDetail }) {
  const { can } = useAuth();
  const me = useMe();
  const nav = useNav();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [marking, setMarking] = useState<{ userId: string; name: string } | null>(null);
  const status = SHOOTING_STATUS[s.status as ShootingStatus];
  const isCrew = s.crew.some((c) => c.person?.id === me.userId);
  const canTick = isCrew || can('shootings.manage');
  const canMark = can('attendance.manage');
  const refs = Array.isArray(s.reference_links) ? (s.reference_links as { url?: string }[]).map((r) => r?.url).filter((u): u is string => !!u) : [];
  const done = s.shotList.filter((i) => i.done).length;

  const invalidate = () => {
    ['shootings', 'calendar', 'home', 'dashboard'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  };
  const tick = useMutation({ mutationFn: ({ i, v }: { i: number; v: boolean }) => toggleShot(s.id, i, v), onSuccess: invalidate, onError: toast.error });
  const move = useMutation({
    mutationFn: (next: ShootingStatus) => updateShootingStatus(s.id, next),
    onSuccess: (_, next) => {
      toast.show(`Syomka: ${SHOOTING_STATUS[next].label}`);
      invalidate();
    },
    onError: toast.error,
  });

  const openMap = () => {
    const query = encodeURIComponent([s.location_name, s.location_address].filter(Boolean).join(', '));
    const url = s.location_url ?? (Platform.OS === 'ios' ? `https://maps.apple.com/?q=${query}` : `https://www.google.com/maps/search/?api=1&query=${query}`);
    Linking.openURL(url).catch(toast.error);
  };

  return (
    <>
      <Card style={styles.header}>
        <View style={styles.headRow}>
          <View style={[styles.timeBox, { backgroundColor: colors.brand }]}>
            <Text variant="title" style={{ color: colors.onBrand }}>
              {formatTime(s.starts_at)}
            </Text>
            <Text variant="micro" style={{ color: colors.onBrand }}>
              {formatTime(s.ends_at)} gacha
            </Text>
          </View>
          <View style={styles.flex}>
            <Text variant="micro" tone="tertiary">
              {[s.client?.name, s.project?.name].filter(Boolean).join(' · ').toUpperCase()}
            </Text>
            <Text variant="title" numberOfLines={3}>
              {s.title}
            </Text>
            <Text variant="caption" tone="secondary">
              {formatDateKeyLong(agencyDateKey(s.starts_at))}
            </Text>
          </View>
        </View>
        <View style={styles.badges}>
          <Badge label={status.label} tone={status.tone} />
          {s.shotList.length ? <Badge label={`Shot list ${done}/${s.shotList.length}`} icon="check-square" /> : null}
        </View>
        {s.location_name || s.location_address ? (
          <Pressable accessibilityRole="button" onPress={openMap} style={({ pressed }) => [styles.location, { backgroundColor: colors.surfaceSunken, opacity: pressed ? 0.7 : 1 }]}>
            <Icon name="map-pin" size={18} color={colors.text} />
            <View style={styles.flex}>
              <Text variant="bodyMedium">{s.location_name ?? 'Lokatsiya'}</Text>
              {s.location_address ? (
                <Text variant="caption" tone="secondary">
                  {s.location_address}
                </Text>
              ) : null}
            </View>
            <Text variant="captionMedium">Xaritada</Text>
          </Pressable>
        ) : null}
        {can('shootings.manage') && NEXT_STATUS[s.status as ShootingStatus] ? (
          <View style={styles.actions}>
            {NEXT_STATUS[s.status as ShootingStatus]!.map((a) => (
              <Button key={a.status} title={a.label} icon={a.icon} size="md" loading={move.isPending} onPress={() => move.mutate(a.status)} />
            ))}
          </View>
        ) : null}
      </Card>

      <Section title={`Jamoa · ${s.crew.length}`}>
        {s.manager ? (
          <Card padded={false}>
            <ItemRow first leading={<Avatar name={s.manager.full_name} url={s.manager.avatar_url} size={32} />} title={s.manager.full_name} subtitle="Mas’ul menejer" />
          </Card>
        ) : null}
        {s.crew.length === 0 ? (
          <EmptyState icon="users" title="Syomka jamoasi biriktirilmagan" />
        ) : (
          <Card padded={false}>
            {s.crew.map((c, i) => {
              if (!c.person) return null;
              const att = s.attendance.find((a) => a.user_id === c.person!.id);
              const meta = att ? SHOOTING_ATTENDANCE_STATUS[att.status as ShootingAttendanceStatus] : null;
              return (
                <ItemRow
                  key={`${c.person.id}:${c.role}`}
                  first={i === 0}
                  leading={<Avatar name={c.person.full_name} url={c.person.avatar_url} size={32} />}
                  title={c.person.full_name}
                  subtitle={[TEAM_ROLE_LABEL[c.role as Enums['team_role']], att?.arrived_at ? `keldi ${formatTime(att.arrived_at)}` : null, att?.late_minutes ? `${att.late_minutes} daq kechikdi` : null]
                    .filter(Boolean)
                    .join(' · ')}
                  right={meta ? <Badge label={meta.label} tone={meta.tone} icon={meta.icon} /> : undefined}
                  onPress={canMark ? () => setMarking({ userId: c.person!.id, name: c.person!.full_name }) : undefined}
                />
              );
            })}
          </Card>
        )}
        {canMark ? (
          <Text variant="caption" tone="tertiary">
            Kim keldi, kechikdi yoki kelmadi — xodimni bosib belgilang. Xodimlar o‘zini belgilay olmaydi.
          </Text>
        ) : null}
      </Section>

      <Section title={`Shot list · ${done}/${s.shotList.length}`}>
        {s.shotList.length === 0 ? (
          <EmptyState icon="check-square" title="Shot list tuzilmagan" />
        ) : (
          <Card padded={false}>
            {s.shotList.map((item, i) => (
              <Pressable
                key={`${i}:${item.title}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.done, disabled: !canTick }}
                disabled={!canTick || tick.isPending}
                onPress={() => tick.mutate({ i, v: !item.done })}
                style={[styles.shot, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              >
                <View style={[styles.check, { borderColor: item.done ? colors.accent : colors.borderStrong, backgroundColor: item.done ? colors.accent : 'transparent' }]}>
                  {item.done ? <Icon name="check" size={13} color={colors.accentText} /> : null}
                </View>
                <Text variant="body" style={[styles.flex, item.done && { color: colors.textTertiary, textDecorationLine: 'line-through' }]}>
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </Card>
        )}
      </Section>

      {s.content.length ? (
        <Section title={`Kontent · ${s.content.length}`}>
          <Card padded={false}>
            {s.content.map((c, i) => (
              <ItemRow
                key={c.id}
                first={i === 0}
                icon={CONTENT_TYPE[c.content_type as Enums['content_type']].icon}
                title={c.title}
                subtitle={`${CONTENT_TYPE[c.content_type as Enums['content_type']].label} #${c.number}`}
                right={<Badge label={CONTENT_STATUS[c.status as Enums['content_status']].label} tone={CONTENT_STATUS[c.status as Enums['content_status']].tone} />}
                onPress={() => nav.content(c.id)}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      {s.description || refs.length ? (
        <Section title="Izoh va referenslar">
          {s.description ? (
            <Card>
              <Text variant="body" selectable>
                {s.description}
              </Text>
            </Card>
          ) : null}
          {refs.length ? (
            <Card padded={false}>
              {refs.map((url, i) => (
                <ItemRow key={url} first={i === 0} icon="link" title={url} onPress={() => Linking.openURL(url)} />
              ))}
            </Card>
          ) : null}
        </Section>
      ) : null}

      {s.actual_started_at || s.actual_ended_at ? (
        <Card style={styles.gap}>
          <KeyValue icon="play" label="Boshlandi" value={s.actual_started_at ? formatTime(s.actual_started_at) : null} />
          <KeyValue icon="flag" label="Yakunlandi" value={s.actual_ended_at ? formatTime(s.actual_ended_at) : null} />
        </Card>
      ) : null}

      <AttendanceSheet shooting={s} target={marking} onClose={() => setMarking(null)} onDone={invalidate} />
    </>
  );
}

const MARKS: ShootingAttendanceStatus[] = ['arrived', 'late', 'absent', 'excused'];

function AttendanceSheet({ shooting, target, onClose, onDone }: { shooting: ShootingDetail; target: { userId: string; name: string } | null; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const { colors } = useTheme();
  const [status, setStatus] = useState<ShootingAttendanceStatus>('arrived');
  const [time, setTime] = useState<string | null>(agencyTimeKey(new Date()));
  const [note, setNote] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      markShootingAttendance(shooting.id, target!.userId, status, time ? agencyDateTimeToIso(agencyDateKey(shooting.starts_at), time) : null, note),
    onSuccess: () => {
      toast.show(`${target!.name}: ${SHOOTING_ATTENDANCE_STATUS[status].label}`);
      onDone();
      setNote('');
      onClose();
    },
    onError: toast.error,
  });
  return (
    <Sheet visible={!!target} onClose={onClose} title={target?.name ?? 'Davomat'} actionLabel="Saqlash" onAction={() => mutation.mutate()} actionDisabled={mutation.isPending}>
      <Text variant="caption" tone="secondary">
        {shooting.title} · {formatTime(shooting.starts_at)} da boshlanadi
      </Text>
      <View style={styles.marks}>
        {MARKS.map((m) => {
          const meta = SHOOTING_ATTENDANCE_STATUS[m];
          const on = status === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setStatus(m)}
              style={[styles.mark, { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentSoft : colors.surface }]}
            >
              <Icon name={meta.icon} size={18} color={colors.text} />
              <Text variant="captionMedium">{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {status === 'arrived' || status === 'late' ? <TimeField label="Kelgan vaqti" value={time} onChange={setTime} /> : null}
      <TextArea label="Izoh" value={note} onChangeText={setNote} maxLength={300} minHeight={60} placeholder={status === 'excused' ? 'Sabab: kasal, ruxsat bilan…' : 'Ixtiyoriy'} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.lg },
  headRow: { flexDirection: 'row', gap: spacing.md },
  timeBox: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center', minWidth: 82 },
  flex: { flex: 1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  location: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md },
  actions: { gap: spacing.sm },
  shot: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 50 },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  gap: { gap: spacing.sm },
  marks: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mark: { width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5 },
});
