import { StyleSheet, View } from 'react-native';

import { Avatar, Card, Counters, Text } from '@/components/ui';
import { ATTENDANCE_STATUS } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Database } from '@/types/database';
import type { CommandCenter } from '../api';

type Status = Database['public']['Enums']['attendance_status'];

export function AttendanceCard({ attendance, onPress }: { attendance: CommandCenter['attendance']; onPress?: () => void }) {
  const { colors } = useTheme();
  const arrived = attendance.present + attendance.late;
  const toneColor = (status: string | null | undefined) => {
    if (!status) return colors.borderStrong;
    const tone = ATTENDANCE_STATUS[status as Status]?.tone;
    return tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : tone === 'danger' ? colors.danger : tone === 'info' ? colors.info : colors.textTertiary;
  };
  return (
    <Card onPress={onPress} accessibilityLabel="Davomat" style={styles.card}>
      <Counters
        items={[
          { label: 'Jami', value: attendance.employees },
          { label: 'Keldi', value: arrived, tone: 'success' },
          { label: 'Kechikdi', value: attendance.late, tone: attendance.late ? 'warning' : 'primary' },
          { label: 'Kelmadi', value: attendance.absent, tone: attendance.absent ? 'danger' : 'primary' },
          { label: 'Masofada', value: attendance.remote },
        ]}
      />
      <View style={styles.people}>
        {attendance.people.map((p) => (
          <View key={p.user_id} style={styles.person} accessibilityLabel={`${p.full_name}: ${p.status ? ATTENDANCE_STATUS[p.status as Status]?.label : 'belgilanmagan'}`}>
            <View>
              <Avatar name={p.full_name} url={p.avatar_url} size={34} />
              <View style={[styles.statusDot, { backgroundColor: toneColor(p.status), borderColor: colors.surface }]} />
            </View>
            <Text variant="micro" tone="secondary" numberOfLines={1} style={styles.personName}>
              {p.full_name.split(' ')[0]}
            </Text>
          </View>
        ))}
      </View>
      {attendance.unmarked > 0 ? (
        <Text variant="caption" tone="warning">
          {attendance.unmarked} xodim hali belgilanmagan
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  people: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  person: { alignItems: 'center', width: 52, gap: 4 },
  personName: { maxWidth: 52 },
  statusDot: { position: 'absolute', right: -1, bottom: -1, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
