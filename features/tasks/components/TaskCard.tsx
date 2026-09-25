import { StyleSheet, View } from 'react-native';

import { AvatarStack, Badge, Card, Icon, Text } from '@/components/ui';
import { OVERDUE, PRIORITY, TASK_STATUS, TASK_TYPE } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatRelativeDeadline, formatShortDateTime } from '@/lib/time';
import type { Database } from '@/types/database';

type Enums = Database['public']['Enums'];

export type TaskSummary = {
  id: string;
  title: string;
  task_type: string;
  status: string;
  priority: string;
  due_at?: string | null;
  client_name?: string | null;
  content_title?: string | null;
  assignees?: { user_id: string; full_name: string; avatar_url?: string | null }[];
};

export function isTaskOverdue(task: Pick<TaskSummary, 'due_at' | 'status'>, now = Date.now()) {
  return !!task.due_at && task.status !== 'done' && task.status !== 'cancelled' && new Date(task.due_at).getTime() < now;
}

/** Task at a glance: type, title, context, status and a deadline that turns red when overdue. */
export function TaskCard({ task, onPress }: { task: TaskSummary; onPress?: () => void }) {
  const { colors } = useTheme();
  const overdue = isTaskOverdue(task);
  const status = overdue ? OVERDUE : TASK_STATUS[task.status as Enums['task_status']];
  const priority = PRIORITY[task.priority as Enums['priority_level']];
  const type = TASK_TYPE[task.task_type as Enums['task_type']];
  const relative = task.status === 'done' ? null : formatRelativeDeadline(task.due_at);

  return (
    <Card onPress={onPress} accessibilityLabel={`${task.title}, ${status.label}`}>
      <View style={styles.top}>
        <Icon name={type?.icon ?? 'check-square'} size={14} color={colors.textTertiary} />
        <Text variant="caption" tone="tertiary" numberOfLines={1} style={styles.flex}>
          {[type?.label, task.client_name].filter(Boolean).join(' · ')}
        </Text>
        {task.priority === 'urgent' || task.priority === 'high' ? <Badge label={priority.label} tone={priority.tone} icon={priority.icon} /> : null}
      </View>
      <Text variant="subheading" numberOfLines={2} style={styles.title}>
        {task.title}
      </Text>
      {task.content_title ? (
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          “{task.content_title}”
        </Text>
      ) : null}
      <View style={styles.bottom}>
        <Badge label={status.label} tone={status.tone} icon={status.icon} />
        <View style={styles.right}>
          {task.assignees?.length ? (
            <AvatarStack people={task.assignees.map((a) => ({ id: a.user_id, name: a.full_name, avatarUrl: a.avatar_url }))} size={22} max={3} />
          ) : null}
          {task.due_at ? (
            <Text variant="captionMedium" tone={overdue ? 'danger' : 'secondary'}>
              {formatShortDateTime(task.due_at)}
              {relative ? ` · ${relative}` : ''}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
  title: { marginTop: spacing.xs },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, gap: spacing.sm },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
});
