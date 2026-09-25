import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar, Badge, Card, EmptyState, ErrorState, SearchField, SkeletonCards, Text } from '@/components/ui';
import { ATTENDANCE_STATUS } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useNav } from '@/lib/routes';
import type { Database } from '@/types/database';
import { fetchTeamDirectory, type TeamMember } from './api';

type Attendance = Database['public']['Enums']['attendance_status'];

export function TeamDirectoryScreen() {
  const { colors } = useTheme();
  const [q, setQ] = useState('');
  const query = useQuery({ queryKey: ['team', 'directory'], queryFn: fetchTeamDirectory });
  const people = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (query.data ?? []).filter(
      (p) => !term || `${p.full_name} ${p.job_title ?? ''} ${p.roles.map((r) => r.name).join(' ')} ${p.phone ?? ''}`.toLowerCase().includes(term),
    );
  }, [query.data, q]);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Jamoa' }} />
      {query.isPending ? (
        <View style={styles.pad}>
          <SkeletonCards count={4} />
        </View>
      ) : query.error && !query.data ? (
        <ErrorState error={query.error} onRetry={() => query.refetch()} />
      ) : (
        <FlatList
          data={people}
          keyExtractor={(p) => p.user_id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => query.refetch()} tintColor={colors.accent} />}
          ListHeaderComponent={<SearchField value={q} onChangeText={setQ} placeholder="Ism, lavozim yoki rol" />}
          ListEmptyComponent={<EmptyState icon="users" title={q ? 'Hech kim topilmadi' : 'Jamoa bo‘sh'} />}
          renderItem={({ item }) => <MemberRow member={item} />}
        />
      )}
    </View>
  );
}

function MemberRow({ member }: { member: TeamMember }) {
  const nav = useNav();
  const attendance = member.attendance_status ? ATTENDANCE_STATUS[member.attendance_status as Attendance] : null;
  return (
    <Card onPress={() => nav.employee(member.user_id)} accessibilityLabel={member.full_name}>
      <View style={styles.row}>
        <Avatar name={member.full_name} url={member.avatar_url} size={44} />
        <View style={styles.body}>
          <Text variant="subheading" numberOfLines={1}>
            {member.full_name}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {member.job_title ?? member.roles.map((r) => r.name).join(', ')}
          </Text>
          {member.open_tasks != null ? (
            <Text variant="caption" tone={member.overdue_tasks ? 'danger' : 'tertiary'}>
              {member.open_tasks} ochiq vazifa · {member.due_today ?? 0} bugun
              {member.overdue_tasks ? ` · ${member.overdue_tasks} overdue` : ''}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>
          {attendance ? <Badge label={attendance.label} tone={attendance.tone} icon={attendance.icon} /> : null}
          {member.shootings_today ? <Badge label={`${member.shootings_today} syomka`} icon="video" tone="violet" /> : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { padding: spacing.xl },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.huge },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  body: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
});
