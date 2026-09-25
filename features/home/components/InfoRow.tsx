import { StyleSheet, View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string | null | undefined }) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Icon name={icon} size={15} color={colors.textTertiary} />
      <Text variant="caption" tone="tertiary" style={styles.label}>
        {label}
      </Text>
      <Text variant="captionMedium" style={styles.value} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  label: { width: 104 },
  value: { flex: 1 },
});
