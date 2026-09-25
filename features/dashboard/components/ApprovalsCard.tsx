import { StyleSheet, View } from 'react-native';

import { Badge, Card, Counters, ItemRow, Text } from '@/components/ui';
import { CONTENT_STATUS, CONTENT_TYPE } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { formatAgo, formatShortDateTime } from '@/lib/time';
import type { Database } from '@/types/database';
import type { CommandCenter } from '../api';

type Enums = Database['public']['Enums'];

export function ApprovalsCard({ approvals, onOpenContent }: { approvals: CommandCenter['approvals']; onOpenContent?: (id: string) => void }) {
  return (
    <Card padded={false}>
      <View style={styles.counters}>
        <Counters
          items={[
            { label: 'Mijozda', value: approvals.client_review, tone: approvals.client_review ? 'warning' : 'primary' },
            { label: 'Ichki tekshiruv', value: approvals.internal_review },
            { label: 'Revision', value: approvals.revision, tone: approvals.revision ? 'danger' : 'primary' },
          ]}
        />
      </View>
      {approvals.items.length === 0 ? (
        <Text variant="caption" tone="tertiary" style={styles.empty}>
          Tasdiq kutayotgan kontent yo‘q
        </Text>
      ) : (
        approvals.items.slice(0, 5).map((item) => {
          const status = CONTENT_STATUS[item.status as Enums['content_status']];
          return (
            <ItemRow
              key={item.content_id}
              icon={CONTENT_TYPE[item.content_type as Enums['content_type']]?.icon ?? 'film'}
              title={item.label}
              subtitle={item.due_at ? `Muddat: ${formatShortDateTime(item.due_at)}` : `Yuborilgan: ${formatAgo(item.since)}`}
              onPress={onOpenContent ? () => onOpenContent(item.content_id) : undefined}
              right={<Badge label={status.label} tone={status.tone} />}
            />
          );
        })
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  counters: { padding: spacing.lg },
  empty: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
