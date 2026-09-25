import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Card } from './Card';
import { Icon, type IconName } from './Icon';
import { Text, type TextTone } from './Text';

type Props = {
  icon?: IconName;
  label: string;
  value: string | number;
  detail?: string;
  tone?: TextTone;
  onPress?: () => void;
  /** Fraction of the grid row: "half" (two per row) or "third". */
  width?: 'half' | 'third' | 'full';
};

/** Metric tile: label, big tabular number, one line of context. */
export function Stat({ icon, label, value, detail, tone = 'primary', onPress, width = 'half' }: Props) {
  const { colors } = useTheme();
  return (
    <Card style={[styles.tile, width === 'half' ? styles.half : width === 'third' ? styles.third : null]} onPress={onPress} accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ''}`}>
      <View style={styles.top}>
        {icon ? <Icon name={icon} size={14} color={colors.textTertiary} /> : null}
        <Text variant="label" tone="tertiary" numberOfLines={1} style={styles.label}>
          {label}
        </Text>
        {onPress ? <Icon name="chevron-right" size={14} color={colors.textTertiary} /> : null}
      </View>
      <Text variant={width === 'third' ? 'metricSmall' : 'metric'} tone={tone}>
        {value}
      </Text>
      {detail ? (
        <Text variant="caption" tone="secondary" numberOfLines={2}>
          {detail}
        </Text>
      ) : null}
    </Card>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  tile: { gap: spacing.xs + 2 },
  half: { flexBasis: '47%', flexGrow: 1 },
  third: { flexBasis: '30%', flexGrow: 1, padding: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  label: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
