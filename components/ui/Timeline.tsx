import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type TimelineItem = {
  id: string;
  time: string;
  title: string;
  /** Short type label shown above the title (e.g. "Syomka"). */
  kicker?: string | null;
  detail?: string | null;
  highlight?: boolean;
  icon?: IconName;
  right?: ReactNode;
  onPress?: () => void;
};

/** Vertical timeline with a rail; items can carry a type icon, the highlighted one gets the lime marker. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  const { colors } = useTheme();
  return (
    <View>
      {items.map((item, i) => {
        const body = (
          <>
            <View style={styles.body}>
              {item.kicker ? (
                <Text variant="micro" tone="tertiary" numberOfLines={1}>
                  {item.kicker.toUpperCase()}
                </Text>
              ) : null}
              <Text variant="bodyMedium" numberOfLines={2}>
                {item.title}
              </Text>
              {item.detail ? (
                <Text variant="caption" tone="secondary" numberOfLines={2}>
                  {item.detail}
                </Text>
              ) : null}
            </View>
            {item.right}
          </>
        );
        return (
          <View key={item.id} style={styles.row}>
            <Text variant="captionMedium" tone="secondary" style={styles.time}>
              {item.time}
            </Text>
            <View style={styles.railCol}>
              {item.icon ? (
                <View style={[styles.iconDot, { backgroundColor: item.highlight ? colors.brand : colors.surfaceSunken }]}>
                  <Icon name={item.icon} size={13} color={item.highlight ? colors.onBrand : colors.text} />
                </View>
              ) : (
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: item.highlight ? colors.brand : colors.surface, borderColor: item.highlight ? colors.brand : colors.borderStrong },
                  ]}
                />
              )}
              {i < items.length - 1 ? <View style={[styles.rail, { backgroundColor: colors.border }]} /> : null}
            </View>
            {item.onPress ? (
              <Pressable accessibilityRole="button" onPress={item.onPress} style={({ pressed }) => [styles.content, pressed && { opacity: 0.6 }]}>
                {body}
              </Pressable>
            ) : (
              <View style={styles.content}>{body}</View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md, minHeight: 56 },
  time: { width: 44, paddingTop: 4, fontVariant: ['tabular-nums'] },
  railCol: { alignItems: 'center', width: 26 },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, marginTop: 6 },
  iconDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rail: { flex: 1, width: StyleSheet.hairlineWidth * 2, marginVertical: 2 },
  content: { flex: 1, flexDirection: 'row', gap: spacing.sm, paddingBottom: spacing.lg },
  body: { flex: 1, gap: 2, paddingTop: 2 },
});
