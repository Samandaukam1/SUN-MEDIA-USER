import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  /** Shows a trailing chevron — the chip opens a picker. */
  dropdown?: boolean;
  count?: number;
};

export function Chip({ label, selected = false, onPress, icon, dropdown, count }: Props) {
  const { colors } = useTheme();
  const fg = selected ? colors.accentText : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: colors.accent, borderColor: colors.accent }
          : { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.8 },
      ]}
    >
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Text variant="captionMedium" style={{ color: fg }} numberOfLines={1}>
        {label}
      </Text>
      {count != null ? (
        <Text variant="micro" style={{ color: selected ? colors.accentText : colors.textTertiary }}>
          {count}
        </Text>
      ) : null}
      {dropdown ? <Icon name="chevron-down" size={14} color={fg} /> : null}
    </Pressable>
  );
}

/** Horizontally scrolling row of chips that bleeds to the screen edges. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.bleed}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    height: 34,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  bleed: { marginHorizontal: -spacing.xl, flexGrow: 0 },
});
