import { StyleSheet, View } from 'react-native';

import { AvatarStack, Badge, Card, Counters, ItemRow, Text } from '@/components/ui';
import { TASK_TYPE } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { formatRelativeDeadline, formatShortDateTime } from '@/lib/time';
import type { Database } from '@/types/database';
import type { CommandCenter } from '../api';

const STATE = {
  overdue: { label: 'Muddati o‘tgan', tone: 'danger' },
  critical: { label: '2 soatdan kam', tone: 'warning' },
  upcoming: { label: '24 soat ichida', tone: 'neutral' },
} as const;

export function DeadlineRadar({ deadlines, onOpenTask }: { deadlines: CommandCenter['deadlines']; onOpenTask?: (id: string) => void }) {
  return (
    <Card padded={false}>
      <View style={styles.counters}>
        <Counters
          items={[
            { label: 'Muddati o‘tgan', value: deadlines.overdue, tone: deadlines.overdue ? 'danger' : 'primary' },
            { label: '2 soatdan kam', value: deadlines.critical, tone: deadlines.critical ? 'warning' : 'primary' },
            { label: '24 soat ichida', value: deadlines.upcoming },
          ]}
        />
      </View>
      {deadlines.items.length === 0 ? (
        <Text variant="caption" tone="tertiary" style={styles.empty}>
          Yaqin 24 soatda muddati keladigan vazifa yo‘q
        </Text>
      ) : (
        deadlines.items.slice(0, 6).map((d) => (
          <ItemRow
            key={d.task_id}
            icon={TASK_TYPE[d.task_type as Database['public']['Enums']['task_type']]?.icon ?? 'check-square'}
            title={d.title}
            subtitle={[d.client_name, `${formatShortDateTime(d.due_at)} · ${formatRelativeDeadline(d.due_at) ?? ''}`].filter(Boolean).join(' · ')}
            onPress={onOpenTask ? () => onOpenTask(d.task_id) : undefined}
            right={
              <View style={styles.right}>
                <Badge label={STATE[d.state].label} tone={STATE[d.state].tone} />
                {d.assignees.length ? <AvatarStack people={d.assignees.map((a) => ({ id: a.user_id, name: a.full_name, avatarUrl: a.avatar_url }))} size={20} max={3} /> : null}
              </View>
            }
          />
        ))
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  counters: { padding: spacing.lg },
  empty: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  right: { alignItems: 'flex-end', gap: 4 },
});
