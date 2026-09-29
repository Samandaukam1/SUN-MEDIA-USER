import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Counters, EmptyState, Icon, QueryView, Screen, Sheet, SkeletonCards, Text, TextArea, TimeField, useToast } from '@/components/ui';
import { ATTENDANCE_STATUS } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { WeekStrip } from '@/features/calendar/components/WeekStrip';
import { useTheme } from '@/hooks/useTheme';
import { agencyDateKey, agencyTimeKey, formatDateKeyLong, weekStartKey, addDaysToKey } from '@/lib/time';
import { fetchAttendanceDay, markAttendance, markManyPresent, type AttendanceStatus, type RosterRow } from './api';

const MARKS: AttendanceStatus[] = ['present', 'late', 'absent', 'excused', 'vacation', 'remote'];

/**
 * Office attendance: owner / admin / permitted managers mark each employee's day.
 * Employees have no check-in button anywhere in the app.
 */
export function AttendanceScreen() {
  const { can } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [day, setDay] = useState(agencyDateKey());
  const [target, setTarget] = useState<{ row: RosterRow; status: AttendanceStatus } | null>(null);
  const canMark = can('attendance.manage');
  const query = useQuery({ queryKey: ['attendance', 'day', day], queryFn: () => fetchAttendanceDay(day) });
  const rows = useMemo(() => (query.data ?? []).filter((r) => r.scheduled || r.status), [query.data]);
  const unmarked = rows.filter((r) => !r.status);

  const bulk = useMutation({
    mutationFn: () => markManyPresent(unmarked.map((r) => r.user_id), day),
    onSuccess: () => {
      toast.show(`${unmarked.length} xodim “Keldi” deb belgilandi`);
      ['attendance', 'dashboard', 'team', 'home'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    },
    onError: toast.error,
  });

  const count = (s: AttendanceStatus) => rows.filter((r) => r.status === s).length;

  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: 'Davomat' }} />
      <View style={styles.nav}>
        <Text variant="heading" style={styles.flex}>
          {formatDateKeyLong(day)}
        </Text>
        {day !== agencyDateKey() ? <Button title="Bugun" size="md" variant="secondary" fullWidth={false} onPress={() => setDay(agencyDateKey())} /> : null}
      </View>
      <WeekStrip weekStart={weekStartKey(day)} selected={day} counts={new Map()} onSelect={setDay} />
      <View style={styles.arrows}>
        <Button title="Oldingi hafta" icon="chevron-left" variant="ghost" size="md" fullWidth={false} onPress={() => setDay(addDaysToKey(day, -7))} />
        <Button title="Keyingi hafta" variant="ghost" size="md" fullWidth={false} onPress={() => setDay(addDaysToKey(day, 7))} />
      </View>

      <QueryView query={query} skeleton={<SkeletonCards count={4} />}>
        {() =>
          rows.length === 0 ? (
            <EmptyState icon="sun" title="Bu kun dam olish kuni" description="Ish jadvaliga ko‘ra bu kunda hech kim ishlamaydi." />
          ) : (
            <>
              <Card>
                <Counters
                  items={[
                    { label: 'Jami', value: rows.length },
                    { label: 'Keldi', value: count('present') + count('late'), tone: 'success' },
                    { label: 'Kechikdi', value: count('late'), tone: count('late') ? 'warning' : 'primary' },
                    { label: 'Kelmadi', value: count('absent'), tone: count('absent') ? 'danger' : 'primary' },
                    { label: 'Belgilanmagan', value: unmarked.length, tone: unmarked.length ? 'warning' : 'primary' },
                  ]}
                />
              </Card>
              {canMark && unmarked.length ? (
                <Button
                  title={`Qolgan ${unmarked.length} kishi — “Keldi”`}
                  icon="check-circle"
                  variant="secondary"
                  loading={bulk.isPending}
                  onPress={() =>
                    Alert.alert('Hammasi keldimi?', `${unmarked.length} xodim o‘z vaqtida kelgan deb belgilanadi.`, [
                      { text: 'Bekor qilish', style: 'cancel' },
                      { text: 'Belgilash', onPress: () => bulk.mutate() },
                    ])
                  }
                />
              ) : null}
              <Card padded={false}>
                {rows.map((r, i) => (
                  <RosterRowView key={r.user_id} row={r} first={i === 0} day={day} canMark={canMark} onMore={(status) => setTarget({ row: r, status })} />
                ))}
              </Card>
              <Text variant="caption" tone="tertiary">
                {canMark ? 'Tugmani bosing — darhol saqlanadi. Sababli, ta’til yoki masofadan ishlash uchun “⋯”. O‘zgarishlar tarixda qoladi.' : 'Davomatni rahbar yoki administrator belgilaydi.'}
              </Text>
            </>
          )
        }
      </QueryView>
      <MarkSheet row={target?.row ?? null} initial={target?.status ?? 'present'} day={day} onClose={() => setTarget(null)} />
    </Screen>
  );
}

const QUICK: AttendanceStatus[] = ['present', 'late', 'absent'];
const REFRESH = ['attendance', 'dashboard', 'team', 'home'];

/**
 * One employee with one-tap marks: "Keldi" and "Kelmadi" save at once, "Kechikdi" asks for the arrival time,
 * "⋯" covers the rest (excused, vacation, remote, a note).
 */
function RosterRowView({ row, first, day, canMark, onMore }: { row: RosterRow; first: boolean; day: string; canMark: boolean; onMore: (status: AttendanceStatus) => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const meta = row.status ? ATTENDANCE_STATUS[row.status] : null;
  const quick = useMutation({
    mutationFn: (status: AttendanceStatus) => markAttendance(row.user_id, day, status, status === 'present' ? row.work_start_time.slice(0, 5) : null, row.note),
    onSuccess: () => REFRESH.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] })),
    onError: toast.error,
  });
  const other = row.status && !QUICK.includes(row.status) ? ATTENDANCE_STATUS[row.status] : null;

  return (
    <View style={[styles.person, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      <View style={styles.personTop}>
        <Avatar name={row.full_name} url={row.avatar_url} size={36} />
        <View style={styles.flex}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {row.full_name}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {[row.job_title, row.arrived_at ? `keldi ${row.arrived_at.slice(0, 5)}` : `ish ${row.work_start_time.slice(0, 5)} da`, row.late_minutes ? `${row.late_minutes} daq kechikdi` : null, row.note]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        {!canMark ? meta ? <Badge label={meta.label} tone={meta.tone} icon={meta.icon} /> : <Badge label="Belgilanmagan" /> : null}
      </View>
      {canMark ? (
        <View style={styles.marks}>
          {QUICK.map((status) => {
            const m = ATTENDANCE_STATUS[status];
            const on = row.status === status;
            const busy = quick.isPending && quick.variables === status;
            return (
              <Pressable
                key={status}
                accessibilityRole="radio"
                accessibilityState={{ checked: on, busy }}
                accessibilityLabel={`${row.full_name}: ${m.label}`}
                disabled={quick.isPending}
                onPress={() => (status === 'late' ? onMore('late') : quick.mutate(status))}
                style={({ pressed }) => [
                  styles.mark,
                  { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accent : pressed ? colors.surfaceSunken : colors.surface },
                ]}
              >
                <Icon name={m.icon} size={14} color={on ? colors.accentText : colors.textSecondary} />
                <Text variant="captionMedium" style={{ color: on ? colors.accentText : colors.text }}>
                  {busy ? '…' : m.label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${row.full_name}: boshqa holat`}
            onPress={() => onMore(other ? row.status! : 'excused')}
            style={({ pressed }) => [
              styles.mark,
              styles.more,
              { borderColor: other ? colors.accent : colors.border, backgroundColor: other ? colors.accent : pressed ? colors.surfaceSunken : colors.surface },
            ]}
          >
            <Text variant="captionMedium" style={{ color: other ? colors.accentText : colors.text }} numberOfLines={1}>
              {other ? other.label : '⋯'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function MarkSheet({ row, initial, day, onClose }: { row: RosterRow | null; initial: AttendanceStatus; day: string; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [status, setStatus] = useState<AttendanceStatus>(initial);
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  // Start from the status the person tapped each time the sheet opens for someone.
  if (row && openedFor !== `${row.user_id}:${initial}`) {
    setOpenedFor(`${row.user_id}:${initial}`);
    setStatus(initial);
  }
  const [time, setTime] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const open = !!row;
  const effectiveTime = time ?? row?.arrived_at?.slice(0, 5) ?? (day === agencyDateKey() ? agencyTimeKey(new Date()) : row?.work_start_time.slice(0, 5) ?? '09:00');

  const mutation = useMutation({
    mutationFn: () => markAttendance(row!.user_id, day, status, status === 'present' || status === 'late' ? effectiveTime : null, note || row?.note || null),
    onSuccess: (saved) => {
      toast.show(`${row!.full_name}: ${ATTENDANCE_STATUS[saved.status].label}${saved.late_minutes ? ` (${saved.late_minutes} daq)` : ''}`);
      REFRESH.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      setTime(null);
      setOpenedFor(null);
      setNote('');
      onClose();
    },
    onError: toast.error,
  });

  return (
    <Sheet visible={open} onClose={onClose} title={row?.full_name ?? 'Davomat'} actionLabel="Saqlash" onAction={() => mutation.mutate()} actionDisabled={mutation.isPending}>
      <Text variant="caption" tone="secondary">
        {formatDateKeyLong(day)} · ish {row?.work_start_time.slice(0, 5)} da boshlanadi
      </Text>
      <View style={styles.grid}>
        {MARKS.map((m) => {
          const meta = ATTENDANCE_STATUS[m];
          const on = status === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setStatus(m)}
              style={[styles.option, { borderColor: on ? colors.accent : colors.border, backgroundColor: on ? colors.accentSoft : colors.surface }]}
            >
              <Icon name={meta.icon} size={18} color={colors.text} />
              <Text variant="captionMedium">{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {status === 'present' || status === 'late' ? (
        <>
          <TimeField label="Kelgan vaqti" value={effectiveTime} onChange={setTime} />
          <Text variant="caption" tone="tertiary">
            Kechikish daqiqasi avtomatik hisoblanadi (sozlamadagi chegara hisobga olinadi).
          </Text>
        </>
      ) : null}
      <TextArea label="Izoh" value={note} onChangeText={setNote} maxLength={1000} minHeight={60} placeholder={status === 'excused' ? 'Sabab: kasal, oilaviy…' : 'Ixtiyoriy'} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  arrows: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5 },
  person: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  personTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  marks: { flexDirection: 'row', gap: spacing.xs + 2 },
  mark: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 34, borderRadius: radius.sm + 2, borderWidth: 1 },
  more: { flex: 0.8 },
});
