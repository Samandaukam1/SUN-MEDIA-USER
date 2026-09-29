import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card, EmptyState, ItemRow, QueryView, Screen, Section, SkeletonCards, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchCrmReports } from '@/features/crm/api';
import { fetchReports } from '@/features/reports/api';
import { formatDateKey, formatMonthYear, formatShortDateTime } from '@/lib/time';
import { useNav } from '@/lib/routes';

const KIND = { weekly: '7 kunlik lidlar hisoboti', monthly: '30 kunlik lidlar hisoboti', custom: 'Lidlar hisoboti' } as const;

/** Akkaunt → Natijalar → Hisobotlar: monthly results and CRM reports SUN MEDIA sent, newest first. */
export function ResultsReportsScreen() {
  const { can } = useAuth();
  const nav = useNav();
  const monthly = useQuery({ queryKey: ['reports', 'list'], queryFn: fetchReports, enabled: can('client.reports.view') });
  const crm = useQuery({ queryKey: ['crm', 'reports', 'all'], queryFn: () => fetchCrmReports(), enabled: can('client.crm.view') });
  const nothing = (monthly.data?.length ?? 0) === 0 && (crm.data?.length ?? 0) === 0 && !monthly.isPending && !crm.isPending;

  return (
    <Screen edges={[]} refreshing={monthly.isRefetching || crm.isRefetching} onRefresh={() => Promise.all([monthly.refetch(), crm.refetch()])}>
      <Stack.Screen options={{ title: 'Hisobotlar' }} />
      {nothing ? (
        <EmptyState icon="file-text" title="Hali hisobot yo‘q" description="Oy yakunidagi natijalar va lidlar hisobotini SUN MEDIA yuborganda shu yerda saqlanadi." />
      ) : null}

      {can('client.reports.view') ? (
        <Section title="Oylik natijalar">
          <QueryView query={monthly} skeleton={<SkeletonCards count={1} />}>
            {(rows) =>
              rows.length === 0 ? (
                <Text variant="caption" tone="tertiary">
                  Oylik hisobot oy yakunida keladi.
                </Text>
              ) : (
                <Card padded={false}>
                  {rows.map((r, i) => (
                    <ItemRow key={r.id} first={i === 0} icon="bar-chart-2" title={formatMonthYear(r.period_month)} subtitle={r.published_at ? `Yuborildi: ${formatShortDateTime(r.published_at)}` : null} onPress={() => nav.report(r.id)} />
                  ))}
                </Card>
              )
            }
          </QueryView>
        </Section>
      ) : null}

      {can('client.crm.view') ? (
        <Section title="Lidlar hisobotlari">
          <QueryView query={crm} skeleton={<SkeletonCards count={1} />}>
            {(rows) =>
              rows.length === 0 ? (
                <Text variant="caption" tone="tertiary">
                  SUN MEDIA 7 yoki 30 kunlik lidlar hisobotini yuborganda shu yerda ko‘rinadi.
                </Text>
              ) : (
                <View style={styles.list}>
                  <Card padded={false}>
                    {rows.map((r, i) => (
                      <ItemRow
                        key={r.id}
                        first={i === 0}
                        icon="users"
                        title={KIND[r.kind as keyof typeof KIND] ?? 'Lidlar hisoboti'}
                        subtitle={`${formatDateKey(r.period_start)} – ${formatDateKey(r.period_end, true)} · ${r.total} ta lid`}
                        onPress={() => nav.go(`/crm/report/${r.id}`)}
                      />
                    ))}
                  </Card>
                </View>
              )
            }
          </QueryView>
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({ list: { gap: spacing.sm } });
