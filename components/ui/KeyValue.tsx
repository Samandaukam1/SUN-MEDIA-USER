import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** Icon + label + value line used in detail cards. Renders nothing when the value is empty. */
export function KeyValue({ icon, label, value, onPress }: { icon?: IconName; label: string; value: string | null | undefined; onPress?: () => void }) {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <View style={styles.row}>
      {icon ? <Icon name={icon} size={15} color={colors.textTertiary} /> : null}
      <Text variant="caption" tone="tertiary" style={styles.label}>
        {label}
      </Text>
      <Text variant="captionMedium" style={styles.value} numberOfLines={3} onPress={onPress} suppressHighlighting>
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
