import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { addDaysToKey, agencyDateKey, formatDateKey, WEEKDAY_SHORT_MON_FIRST } from '@/lib/time';

/** Monday-first week of day pills; days with events get a marker. */
export function WeekStrip({ weekStart, selected, counts, onSelect }: { weekStart: string; selected: string; counts: Map<string, number>; onSelect: (key: string) => void }) {
  const { colors } = useTheme();
  const today = agencyDateKey();
  return (
    <View style={styles.row}>
      {Array.from({ length: 7 }, (_, i) => addDaysToKey(weekStart, i)).map((key, i) => {
        const on = key === selected;
        const count = counts.get(key) ?? 0;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${formatDateKey(key)}, ${count} ta hodisa`}
            onPress={() => onSelect(key)}
            style={[
              styles.day,
              { backgroundColor: on ? colors.accent : colors.surface, borderColor: key === today && !on ? colors.brand : colors.border },
              key === today && !on && styles.today,
            ]}
          >
            <Text variant="micro" style={{ color: on ? colors.accentText : colors.textTertiary }}>
              {WEEKDAY_SHORT_MON_FIRST[i]}
            </Text>
            <Text variant="heading" style={{ color: on ? colors.accentText : colors.text }}>
              {Number(key.slice(8))}
            </Text>
            <View style={[styles.dot, { backgroundColor: count ? (on ? colors.brand : colors.text) : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs + 2 },
  day: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  today: { borderWidth: 1.5 },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
});
