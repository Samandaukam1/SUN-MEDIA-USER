import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Counters, EmptyState, QueryView, Screen, Section, Text } from '@/components/ui';
import { ATTENDANCE_STATUS } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import type { Database } from '@/types/database';
import { fetchTeamDirectory } from './api';

type Attendance = Database['public']['Enums']['attendance_status'];

/** Colleague profile: contact, roles and — for those allowed — today's workload and attendance. */
export function EmployeeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['team', 'directory'], queryFn: fetchTeamDirectory });
  const member = query.data?.find((m) => m.user_id === id);

  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: member?.full_name ?? 'Xodim' }} />
      <QueryView query={query}>
        {() =>
          !member ? (
            <EmptyState icon="user-x" title="Xodim topilmadi" description="Akkaunt o‘chirilgan yoki sizga ko‘rinmaydi." />
          ) : (
            <>
              <View style={styles.header}>
                <Avatar name={member.full_name} url={member.avatar_url} size={84} />
                <Text variant="title" align="center">
                  {member.full_name}
                </Text>
                <Text variant="body" tone="secondary" align="center">
                  {member.job_title ?? '—'}
                </Text>
                <View style={styles.badges}>
                  {member.roles.map((r) => (
                    <Badge key={r.key} label={r.name} tone="accent" />
                  ))}
                  {member.attendance_status ? (
                    <Badge
                      label={`Bugun: ${ATTENDANCE_STATUS[member.attendance_status as Attendance].label}${member.late_minutes ? ` (${member.late_minutes} daq)` : ''}`}
                      tone={ATTENDANCE_STATUS[member.attendance_status as Attendance].tone}
                    />
                  ) : null}
                </View>
              </View>

              <View style={styles.actions}>
                {member.phone ? (
                  <Button title="Qo‘ng‘iroq" icon="phone" variant="secondary" size="md" fullWidth={false} style={styles.flex} onPress={() => Linking.openURL(`tel:${member.phone}`)} />
                ) : null}
                {member.email ? (
                  <Button title="Email" icon="mail" variant="secondary" size="md" fullWidth={false} style={styles.flex} onPress={() => Linking.openURL(`mailto:${member.email}`)} />
                ) : null}
              </View>

              {member.open_tasks != null ? (
                <Section title="Bugungi yuklama">
                  <Card>
                    <Counters
                      items={[
                        { label: 'Ochiq vazifa', value: member.open_tasks ?? 0 },
                        { label: 'Bugun muddat', value: member.due_today ?? 0 },
                        { label: 'Overdue', value: member.overdue_tasks ?? 0, tone: member.overdue_tasks ? 'danger' : 'primary' },
                        { label: 'Syomka', value: member.shootings_today ?? 0 },
                      ]}
                    />
                  </Card>
                </Section>
              ) : null}

              <Section title="Aloqa">
                <Card style={styles.contact}>
                  <Line label="Telefon" value={member.phone ?? '—'} />
                  <Line label="Email" value={member.email ?? '—'} />
                  <Line label="Bo‘lim" value={member.department ?? '—'} />
                </Card>
              </Section>
            </>
          )
        }
      </QueryView>
    </Screen>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
      <Text variant="bodyMedium" selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
  actions: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  contact: { gap: spacing.md },
  line: { gap: 2 },
});
