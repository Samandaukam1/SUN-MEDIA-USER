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
  leading?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  first?: boolean;
};

/** Compact row for lists inside a card (hairline separators, optional leading icon). */
export function ItemRow({ title, subtitle, icon, leading, right, onPress, first }: Props) {
  const { colors } = useTheme();
  const content = (
    <>
      {leading ?? (icon ? (
        <View style={[styles.icon, { backgroundColor: colors.surfaceSunken }]}>
          <Icon name={icon} size={15} color={colors.text} />
        </View>
      ) : null)}
      <View style={styles.text}>
        <Text variant="captionMedium" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="tertiary" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {onPress ? <Icon name="chevron-right" size={16} color={colors.textTertiary} /> : null}
    </>
  );
  const style = [styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }];
  if (!onPress) return <View style={style}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [style, pressed && { backgroundColor: colors.surfaceSunken }]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  icon: { width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 1 },
});
