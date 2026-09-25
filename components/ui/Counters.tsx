import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text, type TextTone } from './Text';

export type Counter = { label: string; value: number | string; tone?: TextTone };

/** A row of labelled numbers separated by hairlines (inside a card or the hero). */
export function Counters({ items, onHero = false }: { items: Counter[]; onHero?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      {items.map((item, i) => (
        <View
          key={item.label}
          accessible
          accessibilityLabel={`${item.label}: ${item.value}`}
          style={[styles.cell, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: onHero ? 'rgba(255,255,255,0.16)' : colors.border }]}
        >
          <Text variant="metricSmall" tone={item.tone ?? (onHero ? 'hero' : 'primary')}>
            {item.value}
          </Text>
          <Text variant="micro" tone={onHero ? 'heroSecondary' : 'tertiary'} numberOfLines={2}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1, gap: 2, paddingHorizontal: spacing.sm },
});
