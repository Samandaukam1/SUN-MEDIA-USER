import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text, type TextTone } from './Text';

/**
 * "Keyingi harakat kimda?" — the three facts that answer "what happens now": where the work is, who holds it
 * and until when. Shown at the top of every content and task page.
 */
export function NextStep({ status, owner, due, late = false, statusTone = 'primary' }: { status: string; owner?: string | null; due?: string | null; late?: boolean; statusTone?: TextTone }) {
  const { colors } = useTheme();
  const cells = [
    { label: 'Hozirgi holat', value: status, tone: statusTone },
    owner !== undefined ? { label: 'Mas’ul', value: owner || 'Biriktirilmagan', tone: (owner ? 'primary' : 'tertiary') as TextTone } : null,
    { label: 'Muddat', value: due || 'Belgilanmagan', tone: (late ? 'danger' : due ? 'primary' : 'tertiary') as TextTone },
  ].filter((c) => c !== null);
  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]} accessibilityLabel={cells.map((c) => `${c.label}: ${c.value}`).join(', ')}>
      {cells.map((c, i) => (
        <View key={c.label} style={[styles.cell, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
          <Text variant="micro" tone="tertiary">
            {c.label}
          </Text>
          <Text variant="captionMedium" tone={c.tone} numberOfLines={2}>
            {c.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.sm },
  cell: { flex: 1, gap: 2, paddingHorizontal: spacing.md },
});
