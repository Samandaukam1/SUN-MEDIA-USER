import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { Text } from './Text';

export function Section({ title, actionLabel, onAction, children }: { title: string; actionLabel?: string; onAction?: () => void; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text variant="label" tone="tertiary">
          {title}
        </Text>
        {actionLabel && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
            <Text variant="captionMedium" tone="accent">
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
