import { StyleSheet, View } from 'react-native';

import { Badge, Card, Text } from '@/components/ui';
import { PRIORITY, TASK_STATUS, TASK_TYPE_LABEL } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { formatRelativeDeadline, formatShortDateTime } from '@/lib/time';
import type { MyTask } from '../api';

export function TaskRow({ task, onPress }: { task: MyTask; onPress?: () => void }) {
  const overdue = !!task.due_at && new Date(task.due_at).getTime() < Date.now();
  const status = TASK_STATUS[task.status];
  const priority = PRIORITY[task.priority];
  const relative = formatRelativeDeadline(task.due_at);
  const context = [task.client?.name, TASK_TYPE_LABEL[task.task_type]].filter(Boolean).join(' · ');

  return (
    <Card onPress={onPress} accessibilityLabel={task.title}>
      <View style={styles.top}>
        <Text variant="caption" tone="tertiary" style={styles.flex}>
          {context}
        </Text>
        {overdue ? <Badge label="Overdue" tone="danger" /> : task.priority === 'urgent' || task.priority === 'high' ? <Badge label={priority.label} tone={priority.tone} /> : null}
      </View>
      <Text variant="bodyMedium" numberOfLines={2} style={styles.title}>
        {task.title}
      </Text>
      <View style={styles.bottom}>
        <Badge label={status.label} tone={status.tone} dot />
        {task.due_at ? (
          <Text variant="captionMedium" tone={overdue ? 'danger' : 'secondary'}>
            {formatShortDateTime(task.due_at)}
            {relative ? ` · ${relative}` : ''}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  title: { marginTop: spacing.xs },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, gap: spacing.sm },
});
