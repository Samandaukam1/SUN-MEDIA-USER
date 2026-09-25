import { StyleSheet, View } from 'react-native';

import { Card, Icon, Text, type IconName, type TextTone } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type Props = { icon: IconName; label: string; value: string; detail?: string; tone?: TextTone };

export function MetricTile({ icon, label, value, detail, tone = 'primary' }: Props) {
  const { colors } = useTheme();
  return (
    <Card style={styles.tile}>
      <View style={styles.top}>
        <Icon name={icon} size={15} color={colors.textTertiary} />
        <Text variant="label" tone="tertiary" numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      </View>
      <Text variant="metric" tone={tone}>
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

const styles = StyleSheet.create({
  tile: { flexBasis: '47%', flexGrow: 1, gap: spacing.xs + 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  label: { flex: 1 },
});
