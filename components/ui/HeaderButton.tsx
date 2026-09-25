import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { Icon, type IconName } from './Icon';

/** Icon button sized for native stack headers (44pt target). */
export function HeaderButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={onPress} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ btn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' } });
