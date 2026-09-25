import { StyleSheet, View } from 'react-native';

import { Card, Counters, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CommandCenter } from '../api';

/** The ink headline card: task completion for the day and the four numbers that need attention. */
export function DashboardHero({ data }: { data: CommandCenter }) {
  const { colors } = useTheme();
  const { tasks } = data;
  const ratio = tasks.total ? tasks.completed / tasks.total : 0;
  return (
    <Card variant="hero" style={styles.card}>
      <View style={styles.top}>
        <Text variant="label" tone="heroSecondary">
          Bugungi vazifalar
        </Text>
        <View style={styles.live}>
          <View style={[styles.dot, { backgroundColor: colors.brand }]} />
          <Text variant="micro" tone="heroSecondary">
            Jonli
          </Text>
        </View>
      </View>
      <View style={styles.headline}>
        <Text variant="hero" tone="hero">
          {tasks.completed}
          <Text variant="metric" tone="heroSecondary">
            /{tasks.total}
          </Text>
        </Text>
        <Text variant="caption" tone="heroSecondary" style={styles.headlineText}>
          bajarildi · {tasks.in_progress} jarayonda · {tasks.todo} navbatda
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%`, backgroundColor: colors.brand }]} />
      </View>
      <Counters
        onHero
        items={[
          { label: 'Muddati o‘tgan', value: tasks.overdue, tone: tasks.overdue > 0 ? 'danger' : 'hero' },
          { label: 'Syomka', value: data.shootings.length },
          { label: 'Tasdiqda', value: data.approvals.client_review + data.approvals.internal_review },
          { label: 'Nashr', value: data.publications.scheduled },
        ]}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg, padding: spacing.xl },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  headline: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  headlineText: { flex: 1, paddingBottom: 6 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
