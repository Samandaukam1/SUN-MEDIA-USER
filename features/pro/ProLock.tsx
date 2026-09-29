import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Icon, Text, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { fetchFeatureCatalog, formatPrice, requestProUpgrade, useEntitlements } from './api';

/**
 * Upgrade preview instead of a blank or forbidden screen: what the Pro feature does, the price, and one action.
 * No in-app payment: the request goes to SUN MEDIA, which keeps mobile store rules intact.
 */
export function ProLock({ feature, title, description }: { feature: string; title?: string; description?: string }) {
  const { colors } = useTheme();
  const toast = useToast();
  const entitlements = useEntitlements();
  const catalog = useQuery({ queryKey: ['plan', 'features'], queryFn: fetchFeatureCatalog, staleTime: 60 * 60_000 });
  const [sent, setSent] = useState(false);
  const meta = catalog.data?.find((f) => f.key === feature);
  const pro = entitlements.data?.pro;
  const request = useMutation({
    mutationFn: () => requestProUpgrade(feature),
    onSuccess: () => {
      setSent(true);
      toast.show('So‘rov SUN MEDIA’ga yuborildi', 'success');
    },
    onError: toast.error,
  });

  return (
    <Card style={[styles.card, { borderColor: colors.accent }]}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <Icon name="star" size={18} color={colors.text} />
        </View>
        <Badge label="PRO" tone="accent" />
      </View>
      <Text variant="heading">{title ?? meta?.name ?? 'SUN MEDIA Pro imkoniyati'}</Text>
      <Text variant="body" tone="secondary">
        {description ?? meta?.description ?? 'Bu bo‘lim SUN MEDIA Pro obunasida ochiladi.'}
      </Text>
      <View style={styles.price}>
        <Text variant="subheading">{pro?.name ?? 'SUN MEDIA Pro'}</Text>
        <Text variant="bodyMedium">{pro?.price_cents != null ? `${formatPrice(pro.price_cents, pro.currency)}/oy` : ''}</Text>
      </View>
      <Button title={sent ? 'So‘rov yuborildi' : 'Pro’ga o‘tish'} icon="star" disabled={sent} loading={request.isPending} onPress={() => request.mutate()} />
      <Text variant="caption" tone="tertiary">
        Promo kodingiz bo‘lsa: Akkaunt → Promo kod.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, borderWidth: 1 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  price: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
