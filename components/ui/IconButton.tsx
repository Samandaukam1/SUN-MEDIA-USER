import { Pressable, StyleSheet, View } from 'react-native';

import { radius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  icon: IconName;
  label: string;
  onPress?: () => void;
  variant?: 'plain' | 'filled' | 'brand';
  size?: number;
  badge?: number;
  disabled?: boolean;
};

/** Round icon-only button with a 44pt touch target and an accessible label. */
export function IconButton({ icon, label, onPress, variant = 'filled', size = 40, badge, disabled }: Props) {
  const { colors } = useTheme();
  const bg = variant === 'brand' ? colors.brand : variant === 'filled' ? colors.surface : 'transparent';
  const fg = variant === 'brand' ? colors.onBrand : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={Math.max(0, (44 - size) / 2)}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { width: size, height: size, backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        variant === 'filled' && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.45)} color={fg} />
      {badge ? (
        <View style={[styles.badge, { backgroundColor: colors.danger, borderColor: colors.background }]}>
          <Text variant="micro" style={styles.badgeText}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, lineHeight: 12 },
});
