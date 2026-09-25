import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { CONTENT_PIPELINE, CONTENT_STATUS } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ContentStatus } from '../api';

/** Horizontal pipeline: done steps filled, the current step on the lime marker, revision flagged. */
export function PipelineSteps({ status }: { status: ContentStatus }) {
  const { colors } = useTheme();
  const current = status === 'revision' ? CONTENT_PIPELINE.indexOf('editing') : CONTENT_PIPELINE.indexOf(status);
  if (status === 'cancelled') {
    return (
      <View style={[styles.cancelled, { backgroundColor: colors.surfaceSunken }]}>
        <Icon name="x-circle" size={16} color={colors.textSecondary} />
        <Text variant="captionMedium" tone="secondary">
          Kontent bekor qilingan
        </Text>
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.row}
      // Keep the current step in view (two steps of context on the left).
      contentOffset={{ x: Math.max(0, (current - 2) * STEP_WIDTH), y: 0 }}
      accessibilityLabel={`Jarayon: ${CONTENT_STATUS[status].label}`}
    >
      {CONTENT_PIPELINE.map((step, i) => {
        const done = i < current;
        const now = i === current;
        const meta = CONTENT_STATUS[step];
        return (
          <View key={step} style={styles.step}>
            <View
              style={[
                styles.dot,
                now
                  ? { backgroundColor: status === 'revision' ? colors.danger : colors.brand }
                  : done
                    ? { backgroundColor: colors.accent }
                    : { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong },
              ]}
            >
              <Icon
                name={done ? 'check' : status === 'revision' && now ? 'rotate-ccw' : meta.icon}
                size={13}
                color={now ? (status === 'revision' ? '#fff' : colors.onBrand) : done ? colors.accentText : colors.textTertiary}
              />
            </View>
            <Text variant="micro" tone={now ? 'primary' : done ? 'secondary' : 'tertiary'} numberOfLines={2} style={styles.label}>
              {now && status === 'revision' ? 'Revision' : meta.label}
            </Text>
            {i < CONTENT_PIPELINE.length - 1 ? <View style={[styles.line, { backgroundColor: done ? colors.accent : colors.border }]} /> : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const STEP_WIDTH = 74;

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.lg },
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  step: { width: STEP_WIDTH, alignItems: 'center', gap: 6 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  label: { textAlign: 'center' },
  line: { position: 'absolute', top: 13, left: 51, width: 46, height: 2 },
  cancelled: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
});
