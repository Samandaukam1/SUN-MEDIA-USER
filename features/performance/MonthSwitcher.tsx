import { StyleSheet, View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { addMonthsToKey, agencyDateKey, formatMonthYear, monthStartKey } from '@/lib/time';

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const current = monthStartKey(agencyDateKey());
  return (
    <View style={styles.row}>
      <IconButton icon="chevron-left" label="Oldingi oy" size={36} onPress={() => onChange(addMonthsToKey(month, -1))} />
      <Text variant="heading" align="center" style={styles.flex}>
        {formatMonthYear(month)}
      </Text>
      <IconButton icon="chevron-right" label="Keyingi oy" size={36} disabled={month >= current} onPress={() => onChange(addMonthsToKey(month, 1))} />
    </View>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, flex: { flex: 1 } });
