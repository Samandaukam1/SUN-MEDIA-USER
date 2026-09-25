import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

type Tone = 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

/** Thin progress bar; value is 0…1 and is clamped. Over-delivery (>1) fills fully. */
export function ProgressBar({ value, tone = 'accent', height = 6, label }: { value: number; tone?: Tone; height?: number; label?: string }) {
  const { colors, scheme } = useTheme();
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const fill = {
    brand: colors.brand,
    accent: scheme === 'dark' ? colors.brand : colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    info: colors.info,
  }[tone];
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: colors.surfaceSunken }]}
    >
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: fill }} />
    </View>
  );
}

const styles = StyleSheet.create({ track: { overflow: 'hidden', width: '100%' } });
