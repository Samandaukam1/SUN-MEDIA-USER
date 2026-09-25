import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';

export type TimelineItem = { id: string; time: string; title: string; detail?: string | null; highlight?: boolean; right?: ReactNode };

/** Vertical timeline with a rail; the highlighted item gets the lime marker. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  const { colors } = useTheme();
  return (
    <View>
      {items.map((item, i) => (
        <View key={item.id} style={styles.row}>
          <Text variant="captionMedium" tone="secondary" style={styles.time}>
            {item.time}
          </Text>
          <View style={styles.railCol}>
            <View
              style={[
                styles.dot,
                { backgroundColor: item.highlight ? colors.brand : colors.surface, borderColor: item.highlight ? colors.brand : colors.borderStrong },
              ]}
            />
            {i < items.length - 1 ? <View style={[styles.rail, { backgroundColor: colors.border }]} /> : null}
          </View>
          <View style={styles.body}>
            <Text variant="bodyMedium" numberOfLines={2}>
              {item.title}
            </Text>
            {item.detail ? (
              <Text variant="caption" tone="secondary" numberOfLines={2}>
                {item.detail}
              </Text>
            ) : null}
          </View>
          {item.right}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, minHeight: 52 },
  time: { width: 44, paddingTop: 1, fontVariant: ['tabular-nums'] },
  railCol: { alignItems: 'center', width: 12 },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, marginTop: 4 },
  rail: { flex: 1, width: StyleSheet.hairlineWidth * 2, marginTop: 2 },
  body: { flex: 1, gap: 2, paddingBottom: spacing.md },
});
