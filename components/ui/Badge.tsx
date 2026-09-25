import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'violet';

export function Badge({ label, tone = 'neutral', dot = false, icon }: { label: string; tone?: BadgeTone; dot?: boolean; icon?: IconName }) {
  const { colors } = useTheme();
  const map = {
    neutral: { bg: colors.surfaceSunken, fg: colors.textSecondary },
    accent: { bg: colors.accentSoft, fg: colors.accentOnSoft },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
    violet: { bg: colors.violetSoft, fg: colors.violet },
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map.bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: map.fg }]} /> : null}
      {icon ? <Icon name={icon} size={12} color={map.fg} /> : null}
      <Text variant="captionMedium" style={{ color: map.fg, fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
