import { StyleSheet, View } from 'react-native';

import { Card, Counters, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatDateKey } from '@/lib/time';
import type { ClientHome } from '../api';

/** Ink headline for the client: current plan and the three numbers of the day. */
export function PlanHero({ home, onPress, canViewPlan = true, clientName }: { home: ClientHome; onPress?: () => void; canViewPlan?: boolean; clientName?: string }) {
  const { colors } = useTheme();
  const sub = home.subscription;
  // People without plan access see their company, not a false "no plan".
  return (
    <Card variant="hero" style={styles.card} onPress={canViewPlan ? onPress : undefined} accessibilityLabel={canViewPlan ? 'Tarif va foydalanish' : clientName}>
      <View style={styles.top}>
        <View style={styles.flex}>
          <Text variant="label" tone="heroSecondary">
            {canViewPlan ? 'Joriy tarif' : 'Kompaniya'}
          </Text>
          <Text variant="title" tone="hero" style={styles.plan}>
            {canViewPlan ? (sub ? sub.plan_name.toUpperCase() : 'Tarif biriktirilmagan') : (clientName ?? '').toUpperCase()}
          </Text>
          {canViewPlan && sub ? (
            <Text variant="caption" tone="heroSecondary">
              {formatDateKey(sub.starts_on)} — {formatDateKey(sub.ends_on, true)}
            </Text>
          ) : null}
        </View>
        <View style={[styles.mark, { backgroundColor: colors.brand }]} />
      </View>
      <Counters
        onHero
        items={[
          { label: 'Jarayonda', value: home.stats.in_production },
          { label: 'Tasdiq kutmoqda', value: home.stats.waiting_approval, tone: home.stats.waiting_approval ? 'brand' : 'hero' },
          { label: 'Bugun nashr', value: home.stats.publishing_today },
        ]}
      />
      <Text variant="caption" tone="heroSecondary">
        Montaj bosqichida: {home.stats.editing} ta kontent
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xl, padding: spacing.xl },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  plan: { letterSpacing: 2 },
  // The lime bar echoes the "I" in the SUN MEDIA logo.
  mark: { width: 8, height: 44, borderRadius: 2 },
});
