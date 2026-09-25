import { StyleSheet, View } from 'react-native';

import { Badge, Card, Counters, ItemRow, Text } from '@/components/ui';
import { PLATFORM, PUBLICATION_STATUS } from '@/constants/labels';
import { spacing } from '@/constants/theme';
import { formatTime } from '@/lib/time';
import type { Database } from '@/types/database';
import type { CommandCenter } from '../api';

type Enums = Database['public']['Enums'];

export function PublicationsCard({ publications, onOpenContent }: { publications: CommandCenter['publications']; onOpenContent?: (id: string) => void }) {
  return (
    <Card padded={false}>
      <View style={styles.counters}>
        <Counters
          items={[
            { label: 'Rejada', value: publications.scheduled },
            { label: 'Joylandi', value: publications.published, tone: publications.published ? 'success' : 'primary' },
            { label: 'Kechikdi', value: publications.delayed, tone: publications.delayed ? 'danger' : 'primary' },
          ]}
        />
      </View>
      {publications.items.length === 0 ? (
        <Text variant="caption" tone="tertiary" style={styles.empty}>
          Bugun nashr rejalashtirilmagan
        </Text>
      ) : (
        publications.items.map((p) => {
          const status = p.delayed ? { label: 'Kechikdi', tone: 'danger' as const } : PUBLICATION_STATUS[p.status as Enums['publication_status']];
          return (
            <ItemRow
              key={p.publication_id}
              icon={PLATFORM[p.platform as Enums['social_platform']]?.icon ?? 'send'}
              title={p.label}
              subtitle={`${formatTime(p.scheduled_at)} · ${PLATFORM[p.platform as Enums['social_platform']]?.label ?? p.platform}`}
              onPress={onOpenContent ? () => onOpenContent(p.content_id) : undefined}
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
