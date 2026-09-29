import { StyleSheet, View } from 'react-native';

import { Badge, Card, Icon, ListGroup, ListRow, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatShortDateTime } from '@/lib/time';
import { useNav } from '@/lib/routes';
import { formatPrice, useEntitlements } from './api';

const SOURCE: Record<string, string> = {
  internal: 'SUN MEDIA ichki litsenziyasi',
  agency: 'Agentlik litsenziyasi orqali',
  promo: 'Promo kod orqali',
  game: 'O‘yin sovg‘asi',
  billing: 'Obuna',
  manual: 'SUN MEDIA tomonidan berilgan',
};

/** Akkaunt: which SUN MEDIA plan this workspace is on, until when, and the promo code entry. */
export function ProStatusCard() {
  const { colors } = useTheme();
  const nav = useNav();
  const e = useEntitlements();
  const plan = e.data?.plan;
  if (!plan) return null;
  const isPro = plan.key !== 'free';
  const own = e.data?.own;
  const detail = [
    SOURCE[e.data?.source ?? ''] ?? null,
    e.data?.ends_at ? `${formatShortDateTime(e.data.ends_at)} gacha` : isPro ? 'muddatsiz' : null,
  ].filter(Boolean).join(' · ');

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: isPro ? colors.accentSoft : colors.surfaceSunken }]}>
            <Icon name="star" size={18} color={colors.text} />
          </View>
          <View style={styles.text}>
            <Text variant="subheading">{plan.name ?? 'Free'}</Text>
            <Text variant="caption" tone="secondary" numberOfLines={2}>
              {isPro ? detail : `Pro — ${formatPrice(e.data?.pro?.price_cents, e.data?.pro?.currency)}/oy: CRM, Instagram analytics, hisobotlar`}
            </Text>
          </View>
          <Badge label={isPro ? 'PRO' : 'FREE'} tone={isPro ? 'accent' : 'neutral'} />
        </View>
        {own && e.data?.inherited ? (
          <Text variant="caption" tone="tertiary">
            {`Shaxsiy Pro ham bor (${SOURCE[own.source ?? ''] ?? own.source}${own.ends_at ? `, ${formatShortDateTime(own.ends_at)} gacha` : ''}).`}
          </Text>
        ) : null}
      </Card>
      <ListGroup>
        <ListRow icon="gift" title="Promo kod" subtitle="Kodni kiriting va Pro’ni faollashtiring" onPress={() => nav.go('/account/promo')} />
      </ListGroup>
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
