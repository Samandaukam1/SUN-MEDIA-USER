import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { elevation, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  /** "hero" is the ink card used once per screen for the headline block. */
  variant?: 'default' | 'hero' | 'sunken';
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export function Card({ children, onPress, onLongPress, style, padded = true, variant = 'default', accessibilityLabel, accessibilityHint }: Props) {
  const { colors, scheme } = useTheme();
  const surface =
    variant === 'hero'
      ? { backgroundColor: colors.hero, borderColor: colors.heroBorder }
      : variant === 'sunken'
        ? { backgroundColor: colors.surfaceSunken, borderColor: colors.border }
        : { backgroundColor: colors.surface, borderColor: colors.border };
  const base = [styles.card, surface, variant === 'default' && elevation(scheme), padded && styles.padded, style];
  if (!onPress && !onLongPress) {
    return <View style={base}>{children}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  padded: { padding: spacing.lg },
  pressed: { opacity: 0.9, transform: [{ scale: 0.992 }] },
});
