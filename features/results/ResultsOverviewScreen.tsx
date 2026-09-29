import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Chip, ChipRow, EmptyState, Icon, ListGroup, ListRow, ProgressBar, QueryView, Screen, Section, SkeletonCards, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { MonthSwitcher } from '@/features/performance/MonthSwitcher';
import { fetchClientPlan } from '@/features/plan/api';
import { ProLock } from '@/features/pro/ProLock';
import { proFeatureOf } from '@/lib/errors';
import { formatCompact, formatNumber } from '@/features/reports/api';
import { useTheme } from '@/hooks/useTheme';
import { agencyDateKey, formatMonthYear, monthStartKey } from '@/lib/time';
import { useNav } from '@/lib/routes';
import type { ClientMembership } from '@/types/app';
import { fetchClientResults, fetchForecast, signed, type ClientResults, type Forecast } from './api';

/** Clients whose results this person may see (a client user usually has one company). */
export function useResultsClients(): ClientMembership[] {
  const me = useMe();
  return me.clients.filter((c) => c.permissions.includes('client.results.view'));
}

/** The month's real results as simple lines: "12 Reel · 47 Story · 4 Syomka · 3,0 mln ko‘rish · +4 200 obunachi · 486 lid". */
export function resultItems(r: ClientResults): { label: string; value: string }[] {
  const items: { label: string; value: string }[] = [];
  const p = r.production;
  if (p.reels) items.push({ label: 'Reels', value: formatNumber(p.reels) });
  if (p.stories) items.push({ label: 'Story', value: formatNumber(p.stories) });
  if (p.posts) items.push({ label: 'Post', value: formatNumber(p.posts) });
  if (p.videos) items.push({ label: 'Video', value: formatNumber(p.videos) });
  if (p.designs) items.push({ label: 'Dizayn', value: formatNumber(p.designs) });
  if (p.shootings) items.push({ label: 'Syomka', value: formatNumber(p.shootings) });
  const ig = r.instagram;
  if (ig?.views != null) items.push({ label: 'Ko‘rish (views)', value: formatCompact(ig.views) });
  if (ig?.reach != null) items.push({ label: 'Qamrov (reach)', value: formatCompact(ig.reach) });
  if (ig?.followers_growth != null) items.push({ label: 'Yangi obunachi', value: signed(formatCompact(ig.followers_growth), ig.followers_growth) });
  if (r.leads) items.push({ label: 'Lid', value: formatNumber(r.leads.delivered) });
  return items;
}

/** Akkaunt → Natijalar → Umumiy natija: what SUN MEDIA did this month, the tariff, and (apart) what more could be. */
export function ResultsOverviewScreen() {
  const clients = useResultsClients();
  const [clientId, setClientId] = useState(clients[0]?.id);
  const client = clients.find((c) => c.id === clientId) ?? clients[0];
  const [month, setMonth] = useState(monthStartKey(agencyDateKey()));
  const results = useQuery({ queryKey: ['results', 'month', client?.id, month], queryFn: () => fetchClientResults(client!.id, month), enabled: !!client });
  const canPlan = !!client?.permissions.includes('client.plan.view');
  const plan = useQuery({ queryKey: ['plan', client?.id], queryFn: () => fetchClientPlan(client!.id), enabled: !!client && canPlan });
  const forecast = useQuery({ queryKey: ['results', 'forecast', client?.id], queryFn: () => fetchForecast(client!.id), enabled: !!client });

  if (!client) {
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: 'Umumiy natija' }} />
        <EmptyState icon="bar-chart-2" title="Natijalar yoqilmagan" description="SUN MEDIA administratori bilan bog‘laning." />
      </Screen>
    );
  }

  return (
    <Screen edges={[]} refreshing={results.isRefetching} onRefresh={() => Promise.all([results.refetch(), plan.refetch(), forecast.refetch()])}>
      <Stack.Screen options={{ title: 'Umumiy natija' }} />
      {clients.length > 1 ? (
        <ChipRow>
          {clients.map((c) => (
            <Chip key={c.id} label={c.name} selected={c.id === client.id} onPress={() => setClientId(c.id)} />
          ))}
        </ChipRow>
      ) : null}
      <MonthSwitcher month={month} onChange={setMonth} />

      <QueryView query={results} skeleton={<SkeletonCards count={2} />}>
        {(r) => <MonthCard results={r} current={month === monthStartKey(agencyDateKey())} />}
      </QueryView>

      {canPlan && plan.data?.current ? (
        <Section title="Tarif">
          <PlanUsage usage={plan.data.usage} planName={plan.data.current.plan.name} />
        </Section>
      ) : null}

      {proFeatureOf(forecast.error) !== null ? (
        <Section title="Taxminiy imkoniyat">
          <ProLock feature="client.forecast" />
        </Section>
      ) : (
        <QueryView query={forecast} skeleton={<SkeletonCards count={1} />}>
          {(f) => <ForecastCard forecast={f} />}
        </QueryView>
      )}
    </Screen>
  );
}

function MonthCard({ results, current }: { results: ClientResults; current: boolean }) {
  const items = resultItems(results);
  return (
    <Card variant="hero" style={styles.hero}>
      <Text variant="label" tone="heroSecondary">
        {current ? `SUN MEDIA bu oy ${results.client.name} uchun` : `${formatMonthYear(results.month)} · ${results.client.name}`}
      </Text>
      {items.length === 0 ? (
        <Text variant="body" tone="hero">
          Bu oy uchun hali natija yo‘q.
        </Text>
      ) : (
        <View style={styles.grid}>
          {items.map((i) => (
            <View key={i.label} style={styles.cell}>
              <Text variant="metricSmall" tone="hero">
                {i.value}
              </Text>
              <Text variant="micro" tone="heroSecondary">
                {i.label}
              </Text>
            </View>
          ))}
        </View>
      )}
      {results.instagram && results.instagram.days_with_data < 28 && current ? (
        <Text variant="micro" tone="heroSecondary">
          {`Instagram raqamlari ${results.instagram.days_with_data} kunlik ma’lumotdan.`}
        </Text>
      ) : null}
    </Card>
  );
}

function PlanUsage({ usage, planName }: { usage: { service_key: string; service_name: string; unit: string; planned: number | null; used: number; is_included: boolean; is_quantitative: boolean }[]; planName: string }) {
  const nav = useNav();
  const rows = usage.filter((u) => u.is_included && u.is_quantitative && u.planned);
  return (
    <Card style={styles.gap} onPress={() => nav.go('/plan')} accessibilityLabel={`Tarif: ${planName}`}>
      <Text variant="subheading">{planName}</Text>
      {rows.map((u) => (
        <View key={u.service_key} style={styles.usage}>
          <View style={styles.usageTop}>
            <Text variant="caption">{u.service_name}</Text>
            <Text variant="captionMedium" tone="secondary">{`${u.used} / ${u.planned} ${u.unit}`}</Text>
          </View>
          <ProgressBar value={u.used / (u.planned || 1)} tone={u.used >= (u.planned ?? 0) ? 'success' : 'accent'} height={5} />
        </View>
      ))}
    </Card>
  );
}

/** TAXMINIY IMKONIYAT — never mixed with real results; a range from this client's own history, or nothing. */
function ForecastCard({ forecast }: { forecast: Forecast }) {
  const { colors } = useTheme();
  const nav = useNav();
  if (!forecast.available) {
    if (forecast.reason !== 'not_enough_data') return null;
    return (
      <Section title="Taxminiy imkoniyat">
        <Card style={[styles.forecast, { borderColor: colors.border }]}>
          <Text variant="caption" tone="secondary">
            {`Yuqori tarif bilan qanday natija bo‘lishini hisoblash uchun kamida 30 kunlik Instagram tarixi va 4 ta o‘lchangan Reels kerak. Hozir: ${forecast.days ?? 0} kun, ${forecast.reels ?? 0} Reels.`}
          </Text>
        </Card>
      </Section>
    );
  }
  const lines = [
    { icon: 'eye' as const, label: 'Ko‘rish (30 kun)', value: `${formatCompact(forecast.views.low)} – ${formatCompact(forecast.views.high)}` },
    forecast.followers ? { icon: 'user-plus' as const, label: 'Yangi obunachi', value: `+${formatCompact(forecast.followers.low)} – ${formatCompact(forecast.followers.high)}` } : null,
    forecast.leads ? { icon: 'users' as const, label: 'Lid', value: `${formatNumber(forecast.leads.low)} – ${formatNumber(forecast.leads.high)}` } : null,
  ].filter((l) => l !== null);
  return (
    <Section title="Taxminiy imkoniyat">
      <Card style={[styles.forecast, { borderColor: colors.border }]}>
        <Text variant="subheading">{`“${forecast.next_plan}” tarifida qanday bo‘lishi mumkin`}</Text>
        <Text variant="caption" tone="secondary">
          {`Oyiga +${forecast.extra_reels} Reels. Hisob sizning oxirgi ${forecast.basis.days} kunlik natijangiz va ${forecast.basis.reels} ta Reels ko‘rsatkichiga asoslangan.`}
        </Text>
        {lines.map((l) => (
          <View key={l.label} style={styles.forecastRow}>
            <Icon name={l.icon} size={16} color={colors.textSecondary} />
            <Text variant="body" style={styles.flex}>
              {l.label}
            </Text>
            <Text variant="bodyMedium">{l.value}</Text>
          </View>
        ))}
        <Text variant="micro" tone="tertiary">
          Taxminiy ko‘rsatkich. Natija kafolatlanmaydi.
        </Text>
      </Card>
      <ListGroup>
        <ListRow icon="credit-card" title="Tariflarni solishtirish" subtitle="Tarifni oshirish so‘rovi" onPress={() => nav.go('/plan')} />
      </ListGroup>
    </Section>
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.md, padding: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md },
  cell: { width: '33.33%', gap: 2 },
  gap: { gap: spacing.md },
  usage: { gap: 4 },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  forecast: { gap: spacing.md, borderWidth: 1, borderStyle: 'dashed' },
  forecastRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
