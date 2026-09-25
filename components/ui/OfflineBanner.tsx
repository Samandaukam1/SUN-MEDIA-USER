import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from './Icon';
import { Text } from './Text';

export function OfflineBanner() {
  const online = useNetworkStatus();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  if (online !== false) return null;
  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: colors.warningSoft, borderColor: colors.border, paddingTop: insets.top + spacing.xs }]}
    >
      <Icon name="wifi-off" size={14} color={colors.warning} />
      <Text variant="captionMedium" tone="warning">
        Internet aloqasi yo‘q — ma’lumotlar yangilanmayapti
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
