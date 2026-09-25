import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatAgo, formatTime } from '@/lib/time';
import type { ActivityItem } from '@/features/dashboard/api';
import { describeActivity } from './describe';

/** Compact activity stream: time, icon, one sentence and the entity it concerns. */
export function ActivityList({ items, relative = false }: { items: ActivityItem[]; relative?: boolean }) {
  const { colors } = useTheme();
  return (
    <Card padded={false}>
      {items.map((item, i) => {
        const d = describeActivity(item);
        return (
          <View key={item.id} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
            <View style={[styles.icon, { backgroundColor: colors.surfaceSunken }]}>
              <Icon name={d.icon} size={15} color={colors.text} />
            </View>
            <View style={styles.text}>
              <Text variant="captionMedium" numberOfLines={2}>
                {d.text}
              </Text>
              {d.detail || item.client_name ? (
                <Text variant="caption" tone="tertiary" numberOfLines={1}>
                  {d.detail ?? item.client_name}
                </Text>
              ) : null}
            </View>
            <Text variant="micro" tone="tertiary" style={styles.time}>
              {relative ? formatAgo(item.occurred_at) : formatTime(item.occurred_at)}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  icon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  time: { fontVariant: ['tabular-nums'] },
});
