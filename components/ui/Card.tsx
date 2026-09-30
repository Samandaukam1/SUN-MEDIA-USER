import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { motion, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { GlassSurface } from './Glass';

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

/** The app's one surface: Liquid Glass material; pressable cards compress slightly and catch more light. */
export function Card({ children, onPress, onLongPress, style, padded = true, variant = 'default', accessibilityLabel, accessibilityHint }: Props) {
  const { colors } = useTheme();
  const glass = variant === 'hero' ? 'hero' : 'card';
  const sunken = variant === 'sunken' ? { backgroundColor: colors.surfaceSunken, borderColor: colors.border } : null;
  if (!onPress && !onLongPress) {
    return (
      <GlassSurface variant={glass} radius={radius.xl} style={[padded && styles.padded, sunken, style]}>
        {children}
      </GlassSurface>
    );
  }
  // How the card sits in its parent (grid width, margins) belongs to the pressable; the look stays on the glass.
  const { outer, inner } = splitLayout(StyleSheet.flatten(style) ?? {});
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [outer, { transform: [{ scale: pressed ? motion.pressScale : 1 }] }]}
    >
      {({ pressed }) => (
        <GlassSurface variant={glass} radius={radius.xl} lifted={pressed} style={[styles.fill, padded && styles.padded, sunken, inner]}>
          {children}
        </GlassSurface>
      )}
    </Pressable>
  );
}

const LAYOUT_KEYS = new Set([
  'flex', 'flexBasis', 'flexGrow', 'flexShrink', 'alignSelf', 'width', 'minWidth', 'maxWidth',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
  'position', 'top', 'left', 'right', 'bottom', 'zIndex',
]);

function splitLayout(style: ViewStyle) {
  const outer: Record<string, unknown> = {};
  const inner: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(style)) (LAYOUT_KEYS.has(k) ? outer : inner)[k] = v;
  return { outer: outer as ViewStyle, inner: inner as ViewStyle };
}

const styles = StyleSheet.create({
  padded: { padding: spacing.lg + 2 },
  fill: { flexGrow: 1 },
});
