import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  title: string;
  subtitle?: string | null;
  icon?: IconName;
  iconTone?: 'neutral' | 'brand' | 'danger' | 'success' | 'warning' | 'info';
  leading?: ReactNode;
  trailing?: ReactNode;
  value?: string | null;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  accessibilityHint?: string;
};

/** Settings/menu style row. */
export function ListRow({ title, subtitle, icon, iconTone = 'neutral', leading, trailing, value, onPress, chevron = !!onPress, destructive, accessibilityHint }: Props) {
  const { colors } = useTheme();
  const tones = {
    neutral: { bg: colors.surfaceSunken, fg: colors.text },
    brand: { bg: colors.accentSoft, fg: colors.accentOnSoft },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    info: { bg: colors.infoSoft, fg: colors.info },
  }[destructive ? 'danger' : iconTone];

  const body = (
    <>
      {leading ?? (icon ? (
        <View style={[styles.icon, { backgroundColor: tones.bg }]}>
          <Icon name={icon} size={17} color={tones.fg} />
        </View>
      ) : null)}
      <View style={styles.text}>
        <Text variant="bodyMedium" numberOfLines={1} style={destructive ? { color: colors.danger } : undefined}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text variant="caption" tone="secondary" numberOfLines={1} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ? <Icon name="chevron-right" size={18} color={colors.textTertiary} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.surfaceSunken }]}
    >
      {body}
    </Pressable>
  );
}

/** Groups rows into one rounded surface with hairline separators. */
export function ListGroup({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {items.map((child, i) => (
        <View key={i}>
          {i > 0 ? <View style={[styles.separator, { backgroundColor: colors.border }]} /> : null}
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 56 },
  icon: { width: 34, height: 34, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
  value: { maxWidth: '40%' },
  group: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
});
