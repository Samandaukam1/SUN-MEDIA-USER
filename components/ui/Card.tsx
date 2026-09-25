import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
  accessibilityLabel?: string;
};

export function Card({ children, onPress, style, padded = true, accessibilityLabel }: Props) {
  const { colors } = useTheme();
  const base = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
    padded && styles.padded,
    style,
  ];
  if (!onPress) {
    return <View style={base}>{children}</View>;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [base, pressed && { opacity: 0.88 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth },
  padded: { padding: spacing.lg },
});
