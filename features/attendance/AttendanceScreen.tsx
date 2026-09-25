import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Counters, EmptyState, Icon, ItemRow, QueryView, Screen, Sheet, SkeletonCards, Text, TextArea, TimeField, useToast } from '@/components/ui';
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
  const [target, setTarget] = useState<RosterRow | null>(null);
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
                  title={`Belgilanmagan ${unmarked.length} kishini “Keldi” deb belgilash`}
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
                {rows.map((r, i) => {
                  const meta = r.status ? ATTENDANCE_STATUS[r.status] : null;
                  return (
                    <ItemRow
                      key={r.user_id}
                      first={i === 0}
                      leading={<Avatar name={r.full_name} url={r.avatar_url} size={36} />}
                      title={r.full_name}
                      subtitle={[
                        r.job_title,
                        `ish ${r.work_start_time.slice(0, 5)}`,
                        r.arrived_at ? `keldi ${r.arrived_at.slice(0, 5)}` : null,
                        r.late_minutes ? `${r.late_minutes} daq kechikdi` : null,
                        r.note,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                      right={meta ? <Badge label={meta.label} tone={meta.tone} icon={meta.icon} /> : <Badge label="Belgilanmagan" />}
                      onPress={canMark ? () => setTarget(r) : undefined}
                    />
                  );
                })}
              </Card>
              <Text variant="caption" tone="tertiary">
                {canMark ? 'Xodimni bosib holatini belgilang. Barcha o‘zgarishlar tarixda saqlanadi.' : 'Davomatni faqat owner, admin yoki ruxsatli menejer belgilaydi.'}
              </Text>
            </>
          )
        }
      </QueryView>
      <MarkSheet row={target} day={day} onClose={() => setTarget(null)} />
    </Screen>
  );
}

function MarkSheet({ row, day, onClose }: { row: RosterRow | null; day: string; onClose: () => void }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [time, setTime] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const open = !!row;
  const effectiveTime = time ?? row?.arrived_at?.slice(0, 5) ?? (day === agencyDateKey() ? agencyTimeKey(new Date()) : row?.work_start_time.slice(0, 5) ?? '09:00');

  const mutation = useMutation({
    mutationFn: () => markAttendance(row!.user_id, day, status, status === 'present' || status === 'late' ? effectiveTime : null, note || row?.note || null),
    onSuccess: (saved) => {
      toast.show(`${row!.full_name}: ${ATTENDANCE_STATUS[saved.status].label}${saved.late_minutes ? ` (${saved.late_minutes} daq)` : ''}`);
      ['attendance', 'dashboard', 'team', 'home'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      setTime(null);
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
});
