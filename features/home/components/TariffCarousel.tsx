import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { fetchClientPlan } from '@/features/plan/api';
import { formatCompact, formatNumber } from '@/features/reports/api';
import { fetchClientResults, fetchForecast, signed, type Forecast } from '@/features/results/api';
import { useTheme } from '@/hooks/useTheme';
import { proFeatureOf } from '@/lib/errors';
import { useNav } from '@/lib/routes';
import type { ClientMembership } from '@/types/app';

const HIDE_KEY = 'sunmedia.hidePlanPrice';

function money(value: number | null | undefined, currency: string | undefined): string {
  if (value == null) return '—';
  if (currency === 'USD') return `$${formatNumber(value)}`;
  if (currency === 'UZS') return `${formatNumber(value)} so‘m`;
  return `${formatNumber(value)} ${currency ?? ''}`.trim();
}

/** Home: the current tariff with this month's REAL numbers, and (swipe) what a higher tariff COULD bring. */
export function TariffCarousel({ client }: { client: ClientMembership }) {
  const { colors } = useTheme();
  const nav = useNav();
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - spacing.xl * 2 - 56, 420);
  const [hidden, setHidden] = useState(false);
  const plan = useQuery({ queryKey: ['plan', client.id], queryFn: () => fetchClientPlan(client.id) });
  const results = useQuery({ queryKey: ['results', 'month', client.id, 'current'], queryFn: () => fetchClientResults(client.id) });
  const forecast = useQuery({ queryKey: ['results', 'forecast', client.id], queryFn: () => fetchForecast(client.id), retry: false });

  useEffect(() => {
    AsyncStorage.getItem(HIDE_KEY)
      .then((v) => setHidden(v === '1'))
      .catch(() => undefined);
  }, []);
  const toggle = () => {
    setHidden((h) => {
      AsyncStorage.setItem(HIDE_KEY, h ? '0' : '1').catch(() => undefined);
      return !h;
    });
  };

  const current = plan.data?.current;
  if (!current) return null;
  const r = results.data;
  const ig = r?.instagram;
  const stats = [
    { label: 'Obunachilar', value: ig?.followers != null ? formatCompact(ig.followers) : '—', hint: ig?.followers_growth != null ? `${signed(formatCompact(ig.followers_growth), ig.followers_growth)} bu oy` : null },
    { label: 'Ko‘rishlar', value: ig?.views != null ? formatCompact(ig.views) : '—', hint: null },
    { label: 'Qamrov', value: ig?.reach != null ? formatCompact(ig.reach) : '—', hint: null },
    { label: 'Lidlar', value: r?.leads ? formatNumber(r.leads.delivered) : '—', hint: null },
  ];
  const f = forecast.data;
  const locked = proFeatureOf(forecast.error) !== null;
  const showSecond = locked || (f && (f.available || f.reason === 'not_enough_data'));
  // A single card (e.g. already on the top tariff) takes the full width; with two, the next one peeks in.
  const width1 = showSecond ? cardW : Math.min(width - spacing.xl * 2, 520);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardW + spacing.md}
      decelerationRate="fast"
      contentContainerStyle={styles.row}
      style={styles.bleed}
    >
      <Card variant="hero" style={[styles.card, { width: width1 }]}>
        <View style={styles.priceRow}>
          <Text variant="label" tone="heroSecondary" style={styles.flex}>
            {`Sizning tarifingiz · ${current.plan.name}`}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={hidden ? 'Narxni ko‘rsatish' : 'Narxni yashirish'} hitSlop={12} onPress={toggle}>
            <Icon name={hidden ? 'eye-off' : 'eye'} size={20} color={colors.heroTextSecondary} />
          </Pressable>
        </View>
        <Text variant="title" tone="hero" numberOfLines={1} adjustsFontSizeToFit>
          {hidden ? '••••' : money(current.price, current.currency)}
        </Text>
        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.cell}>
              <Text variant="metricSmall" tone="hero">
                {s.value}
              </Text>
              <Text variant="micro" tone="heroSecondary">
                {s.label}
              </Text>
              {s.hint ? (
                <Text variant="micro" tone="brand">
                  {s.hint}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
        <Pressable accessibilityRole="button" onPress={() => nav.go('/results')} hitSlop={6}>
          <Text variant="captionMedium" tone="hero">
            Natijalar →
          </Text>
        </Pressable>
      </Card>

      {showSecond ? (
        <Card style={[styles.card, styles.forecast, { width: cardW, borderColor: colors.border }]}>
          <Text variant="label" tone="tertiary">
            Taxminiy imkoniyat
          </Text>
          {locked ? (
            <>
              <Text variant="heading">Yuqori tarifda qanday bo‘lardi?</Text>
              <Text variant="caption" tone="secondary">
                Prognoz SUN MEDIA Pro’da. Natijalar bo‘limida batafsil.
              </Text>
            </>
          ) : f ? (
            <ForecastBody f={f} />
          ) : null}
          <Pressable accessibilityRole="button" onPress={() => nav.go('/results')} hitSlop={6}>
            <Text variant="captionMedium" tone="accent">
              Batafsil →
            </Text>
          </Pressable>
        </Card>
      ) : null}
    </ScrollView>
  );
}

function ForecastBody({ f }: { f: Forecast }) {
  const next = 'next_price' in f && f.next_price != null ? money(Number(f.next_price), 'currency' in f ? (f.currency as string) : undefined) : null;
  const heading = next ? `Agar ${next} tarifda bo‘lganingizda…` : 'Yuqori tarifda…';
  if (!f.available) {
    return (
      <>
        <Text variant="heading">{heading}</Text>
        <Text variant="caption" tone="secondary">
          Prognoz uchun hali yetarli tarixiy ma’lumot yig‘ilmagan.
        </Text>
      </>
    );
  }
  const lines = [
    `${formatCompact(f.views.low)}–${formatCompact(f.views.high)} ko‘rish`,
    f.followers ? `+${formatCompact(f.followers.low)}–${formatCompact(f.followers.high)} obunachi` : null,
    f.leads ? `${formatNumber(f.leads.low)}–${formatNumber(f.leads.high)} lid` : null,
  ].filter(Boolean);
  return (
    <>
      <Text variant="heading">{heading}</Text>
      {lines.map((l) => (
        <Text key={l} variant="bodyMedium">
          {l}
        </Text>
      ))}
      <Text variant="micro" tone="tertiary">
        Taxminiy ko‘rsatkich. Natija kafolatlanmaydi.
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  bleed: { marginHorizontal: -spacing.xl },
  row: { paddingHorizontal: spacing.xl, gap: spacing.md },
  card: { gap: spacing.md, padding: spacing.lg },
  forecast: { borderWidth: 1, borderStyle: 'dashed' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  cell: { width: '50%', gap: 2 },
});
