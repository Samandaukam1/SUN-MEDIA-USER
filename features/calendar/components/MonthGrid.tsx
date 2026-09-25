import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { agencyDateKey, formatDateKey, monthGrid, WEEKDAY_SHORT_MON_FIRST } from '@/lib/time';
import type { EventGroup } from '../api';

type DayInfo = { total: number; groups: Set<EventGroup> };

const GROUP_ORDER: EventGroup[] = ['shooting', 'publication', 'approval', 'deadline', 'company'];

/** Month grid: day number + up to four type markers; the list under it carries icons and labels. */
export function MonthGrid({ month, selected, days, onSelect }: { month: string; selected: string; days: Map<string, DayInfo>; onSelect: (key: string) => void }) {
  const { colors } = useTheme();
  const today = agencyDateKey();
  const tone: Record<EventGroup, string> = {
    all: colors.text,
    shooting: colors.violet,
    publication: colors.success,
    approval: colors.warning,
    deadline: colors.accent,
    company: colors.info,
  };
  return (
    <View>
      <View style={styles.week}>
        {WEEKDAY_SHORT_MON_FIRST.map((d) => (
          <Text key={d} variant="micro" tone="tertiary" style={styles.weekCell}>
            {d}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {monthGrid(month).map((key) => {
          const inMonth = key.slice(0, 7) === month.slice(0, 7);
          const info = days.get(key);
          const on = key === selected;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${formatDateKey(key)}${info?.total ? `, ${info.total} ta hodisa` : ''}`}
              onPress={() => onSelect(key)}
              style={styles.cell}
            >
              <View style={[styles.num, on && { backgroundColor: colors.accent }, !on && key === today && { borderWidth: 1.5, borderColor: colors.brand }]}>
                <Text variant="bodyMedium" style={{ color: on ? colors.accentText : inMonth ? colors.text : colors.textTertiary, opacity: inMonth ? 1 : 0.45 }}>
                  {Number(key.slice(8))}
                </Text>
              </View>
              <View style={styles.markers}>
                {GROUP_ORDER.filter((g) => info?.groups.has(g))
                  .slice(0, 4)
                  .map((g) => (
                    <View key={g} style={[styles.marker, { backgroundColor: tone[g] }]} />
                  ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row', marginBottom: spacing.xs },
  weekCell: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3, gap: 2 },
  num: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  markers: { flexDirection: 'row', gap: 2, height: 5 },
  marker: { width: 5, height: 5, borderRadius: 3 },
});
