import { ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, Card, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import type { CommandCenter } from '../api';

/** Horizontal strip: one card per active client with the numbers that describe its day. */
export function ClientStatusList({ clients, onOpenClient }: { clients: CommandCenter['clients']; onOpenClient?: (id: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bleed} contentContainerStyle={styles.row}>
      {clients.map((c) => (
        <Card key={c.id} style={styles.card} onPress={onOpenClient ? () => onOpenClient(c.id) : undefined} accessibilityLabel={c.name}>
          <View style={styles.head}>
            <Avatar name={c.name} url={c.logo_url} size={32} />
            <View style={styles.flex}>
              <Text variant="subheading" numberOfLines={1}>
                {c.name}
              </Text>
              <Text variant="micro" tone="tertiary">
                {c.active_projects} faol loyiha
              </Text>
            </View>
          </View>
          <View style={styles.metrics}>
            <Metric label="Ishlab chiqarishda" value={c.in_production} />
            <Metric label="Tasdiq kutmoqda" value={c.waiting_approval} tone={c.waiting_approval ? 'warning' : undefined} />
            <Metric label="Bugungi hodisa" value={c.today_events} />
            <Metric label="Overdue" value={c.overdue_tasks} tone={c.overdue_tasks ? 'danger' : undefined} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'warning' | 'danger' }) {
  return (
    <View style={styles.metric}>
      <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.flex}>
        {label}
      </Text>
      <Text variant="captionMedium" tone={tone ?? 'primary'} style={styles.num}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.xl },
  row: { paddingHorizontal: spacing.xl, gap: spacing.md },
  card: { width: 232, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  metrics: { gap: 6 },
  metric: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  num: { fontVariant: ['tabular-nums'] },
});
