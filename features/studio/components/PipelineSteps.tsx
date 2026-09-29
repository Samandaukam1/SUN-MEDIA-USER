import { ScrollView, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { contentStages } from '@/constants/labels';
import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { ContentStatus } from '../api';

/** Where the content is on its way: done steps filled, the current one on the lime marker, rework flagged. */
export function PipelineSteps({ status, isClient = false }: { status: ContentStatus; isClient?: boolean }) {
  const { colors } = useTheme();
  const stages = contentStages(isClient);
  const current = stages.findIndex((s) => s.statuses.includes(status));
  if (status === 'cancelled' || current < 0) {
    return (
      <View style={[styles.cancelled, { backgroundColor: colors.surfaceSunken }]}>
        <Icon name="x-circle" size={16} color={colors.textSecondary} />
        <Text variant="captionMedium" tone="secondary">
          Kontent bekor qilingan
        </Text>
      </View>
    );
  }
  // Clients see a plain "Montaj"; only staff are told the work came back for rework.
  const rework = status === 'revision' && !isClient;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bleed}
      contentContainerStyle={styles.row}
      // Keep the current step in view (two steps of context on the left).
      contentOffset={{ x: Math.max(0, (current - 2) * STEP_WIDTH), y: 0 }}
      accessibilityLabel={`Bosqich: ${stages[current].label}`}
    >
      {stages.map((step, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <View key={step.key} style={styles.step}>
            <View
              style={[
                styles.dot,
                now
                  ? { backgroundColor: rework ? colors.danger : colors.brand }
                  : done
                    ? { backgroundColor: colors.accent }
                    : { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.borderStrong },
              ]}
            >
              <Icon
                name={done ? 'check' : rework && now ? 'rotate-ccw' : step.icon}
                size={13}
                color={now ? (rework ? '#fff' : colors.onBrand) : done ? colors.accentText : colors.textTertiary}
              />
            </View>
            <Text variant="micro" tone={now ? 'primary' : done ? 'secondary' : 'tertiary'} numberOfLines={2} style={styles.label}>
              {now && rework ? 'Qayta ishlash' : step.label}
            </Text>
            {i < stages.length - 1 ? <View style={[styles.line, { backgroundColor: done ? colors.accent : colors.border }]} /> : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const STEP_WIDTH = 70;

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.lg },
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  step: { width: STEP_WIDTH, alignItems: 'center', gap: 6 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  label: { textAlign: 'center' },
  line: { position: 'absolute', top: 13, left: 49, width: 42, height: 2 },
  cancelled: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
});
