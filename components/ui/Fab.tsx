import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { elevation, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Icon, type IconName } from './Icon';

/**
 * Floating action button for the screen's primary create action. In tab screens the tab bar already
 * covers the home indicator; on stack screens pass `overHomeIndicator` to lift it above the inset.
 */
export function Fab({ icon = 'plus', label, onPress, overHomeIndicator = false }: { icon?: IconName; label: string; onPress: () => void; overHomeIndicator?: boolean }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
        onPress();
      }}
      style={({ pressed }) => [
        styles.fab,
        elevation('light', 2),
        { backgroundColor: colors.brand, bottom: spacing.lg + (overHomeIndicator ? insets.bottom : 0), transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <Icon name={icon} size={24} color={colors.onBrand} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: { position: 'absolute', right: spacing.xl, width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
