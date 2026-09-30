import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { motion, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const background = {
    primary: colors.accent,
    secondary: colors.glassStrong,
    ghost: 'transparent',
    danger: colors.dangerSoft,
  }[variant];
  const foreground = {
    primary: colors.accentText,
    secondary: colors.text,
    ghost: colors.text,
    danger: colors.danger,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={inactive}
      onPress={() => {
        if (variant === 'primary' && Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        }
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: background, opacity: inactive ? 0.5 : 1, transform: [{ scale: pressed && !inactive ? motion.pressScale : 1 }] },
        variant === 'primary' && pressed && { opacity: 0.92 },
        variant === 'secondary' && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder, borderTopColor: colors.glassEdge },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon name={icon} size={18} color={foreground} /> : null}
          <Text variant="bodyMedium" style={{ color: foreground }}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg - 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  lg: { height: 52 },
  md: { height: 42, paddingHorizontal: spacing.lg },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
