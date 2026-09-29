import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text, type TextTone } from './Text';

export type Metric = { label: string; value: number | string; tone?: TextTone; hint?: string | null; onPress?: () => void };

/** Numbers of the day in a 3-column grid on the ink hero card; a tile with onPress opens its screen. */
export function MetricGrid({ items }: { items: Metric[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.grid}>
      {items.map((item) => {
        const body = (
          <>
            <Text variant="metricSmall" tone={item.tone ?? 'hero'}>
              {item.value}
            </Text>
            <Text variant="micro" tone="heroSecondary" numberOfLines={1}>
              {item.label}
            </Text>
            {item.hint ? (
              <Text variant="micro" tone={item.tone === 'hero' ? 'heroSecondary' : (item.tone ?? 'heroSecondary')} numberOfLines={1}>
                {item.hint}
              </Text>
            ) : null}
          </>
        );
        const label = `${item.label}: ${item.value}${item.hint ? `, ${item.hint}` : ''}`;
        return item.onPress ? (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={item.onPress}
            style={({ pressed }) => [styles.tile, { backgroundColor: pressed ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)' }]}
          >
            {body}
          </Pressable>
        ) : (
          <View key={item.label} accessible accessibilityLabel={label} style={[styles.tile, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: colors.heroBorder }]}>
            {body}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '31.5%', flexGrow: 1, gap: 2, paddingVertical: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.md },
});
