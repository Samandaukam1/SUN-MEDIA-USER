import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Text } from './Text';

/** `count` > 0 puts a small dot on the segment (unread, waiting…); the number is read out by screen readers. */
type Option<T extends string> = { value: T; label: string; count?: number };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors, scheme } = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.track, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.count ? `${option.label}, ${option.count}` : option.label}
            onPress={() => {
              if (active) return;
              if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => undefined);
              onChange(option.value);
            }}
            style={[
              styles.segment,
              active && { backgroundColor: scheme === 'dark' ? colors.surfaceRaised : colors.surface },
              active && scheme === 'light' && styles.lift,
            ]}
          >
            <Text variant="captionMedium" style={{ color: active ? colors.text : colors.textSecondary }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {option.label}
            </Text>
            {option.count ? <View style={[styles.dot, { backgroundColor: colors.brand, borderColor: colors.accent }]} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: 3, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  segment: { flex: 1, height: 34, borderRadius: radius.sm + 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: spacing.xs + 2 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  lift: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
