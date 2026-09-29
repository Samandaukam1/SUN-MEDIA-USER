import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { ProgressBar } from './ProgressBar';
import { Text } from './Text';

type Point = { key: string; value: number | null; label?: string };

/**
 * Daily trend as slim vertical bars (no chart library). Days without data are drawn as empty slots, never as zero.
 * `edgeLabels` prints the first and last label under the chart.
 */
export function TrendBars({ points, height = 72, accessibilityLabel }: { points: Point[]; height?: number; accessibilityLabel: string }) {
  const { colors, scheme } = useTheme();
  const max = Math.max(1, ...points.map((p) => p.value ?? 0));
  const fill = scheme === 'dark' ? colors.brand : colors.accent;
  const first = points[0]?.label;
  const last = points[points.length - 1]?.label;
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={styles.trend}>
      <View style={[styles.bars, { height }]}>
        {points.map((p) => (
          <View key={p.key} style={styles.slot}>
            {p.value == null ? (
              <View style={[styles.missing, { backgroundColor: colors.border }]} />
            ) : (
              <View style={[styles.bar, { height: Math.max(2, (p.value / max) * height), backgroundColor: fill }]} />
            )}
          </View>
        ))}
      </View>
      {first || last ? (
        <View style={styles.edges}>
          <Text variant="micro" tone="tertiary">
            {first}
          </Text>
          <Text variant="micro" tone="tertiary">
            {last}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** "Kampaniya A ███████ 42" rows, largest first; values relative to the biggest row. */
export function BreakdownBars({ rows, format = String }: { rows: { name: string; value: number; detail?: string | null }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <View style={styles.breakdown}>
      {rows.map((r) => (
        <View key={r.name} style={styles.row}>
          <View style={styles.rowTop}>
            <Text variant="captionMedium" numberOfLines={1} style={styles.rowName}>
              {r.name}
            </Text>
            <Text variant="captionMedium" tone="secondary">
              {format(r.value)}
            </Text>
          </View>
          <ProgressBar value={r.value / max} height={5} label={`${r.name}: ${format(r.value)}`} />
          {r.detail ? (
            <Text variant="micro" tone="tertiary" numberOfLines={1}>
              {r.detail}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  trend: { gap: spacing.xs },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  slot: { flex: 1, justifyContent: 'flex-end', height: '100%' },
  bar: { borderRadius: 2, width: '100%' },
  missing: { height: 2, borderRadius: 1, width: '100%' },
  edges: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdown: { gap: spacing.md },
  row: { gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  rowName: { flex: 1 },
});
