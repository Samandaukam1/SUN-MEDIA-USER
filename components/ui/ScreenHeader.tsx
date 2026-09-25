import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Text } from './Text';

type Props = {
  title: string;
  /** Small line above the title, e.g. the date or the company name. */
  eyebrow?: string;
  subtitle?: string;
  right?: ReactNode;
};

/** Large title block used at the top of every tab screen. */
export function ScreenHeader({ title, eyebrow, subtitle, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        {eyebrow ? (
          <Text variant="captionMedium" tone="tertiary" numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="display" accessibilityRole="header" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="secondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  text: { flex: 1, gap: spacing.xxs },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.xs },
});
