import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { isNetworkError, isPermissionError, toUserMessage } from '@/lib/errors';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type EmptyProps = { icon?: IconName; title: string; description?: string; actionLabel?: string; onAction?: () => void };

export function EmptyState({ icon = 'inbox', title, description, actionLabel, onAction }: EmptyProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
        <Icon name={icon} size={22} color={colors.textSecondary} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      {description ? (
        <Text variant="caption" tone="secondary" align="center" style={styles.description}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button title={actionLabel} onPress={onAction} variant="secondary" size="md" fullWidth={false} style={styles.action} />
      ) : null}
    </View>
  );
}

/** Loading / error / unauthorized / offline in one component for query results. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { colors } = useTheme();
  const offline = isNetworkError(error);
  const forbidden = isPermissionError(error);
  const icon: IconName = offline ? 'wifi-off' : forbidden ? 'lock' : 'alert-triangle';
  const title = offline ? 'Aloqa yo‘q' : forbidden ? 'Ruxsat yo‘q' : 'Nimadir xato ketdi';
  return (
    <View style={styles.container} accessibilityRole="alert">
      <View style={[styles.iconWrap, { backgroundColor: forbidden ? colors.surfaceRaised : colors.dangerSoft, borderColor: colors.border }]}>
        <Icon name={icon} size={22} color={forbidden ? colors.textSecondary : colors.danger} />
      </View>
      <Text variant="heading" align="center">
        {title}
      </Text>
      <Text variant="caption" tone="secondary" align="center" style={styles.description}>
        {toUserMessage(error)}
      </Text>
      {onRetry && !forbidden ? (
        <Button title="Qayta urinish" icon="refresh-cw" onPress={onRetry} variant="secondary" size="md" fullWidth={false} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.huge, paddingHorizontal: spacing.xxl, gap: spacing.sm },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, marginBottom: spacing.sm },
  description: { maxWidth: 300 },
  action: { marginTop: spacing.md },
});
