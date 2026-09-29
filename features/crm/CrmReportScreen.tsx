import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Card, QueryView, Screen, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { formatDateKey, formatShortDateTime } from '@/lib/time';
import { fetchCrmReport } from './api';
import { CrmReportView } from './components/CrmReportView';

const KIND = { weekly: '7 kunlik', monthly: '30 kunlik', custom: 'Maxsus muddat' } as const;

/** A CRM report SUN MEDIA sent (client) or that an admin opened from the list. */
export function CrmReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['crm', 'report', id], queryFn: () => fetchCrmReport(id), enabled: !!id });
  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: 'Lidlar hisoboti' }} />
      <QueryView query={query}>
        {(r) => (
          <>
            <Card style={styles.head}>
              <Text variant="label" tone="tertiary">
                {`${KIND[r.kind as keyof typeof KIND] ?? 'Hisobot'} · ${r.client?.name ?? ''}`}
              </Text>
              <Text variant="title">{`${formatDateKey(r.period_start)} – ${formatDateKey(r.period_end, true)}`}</Text>
              <Text variant="caption" tone="tertiary">
                {`Yuborildi: ${formatShortDateTime(r.sent_at)}${r.sender?.full_name ? ` · ${r.sender.full_name}` : ''}`}
              </Text>
              {r.note ? <Text variant="body">{r.note}</Text> : null}
            </Card>
            <CrmReportView data={r.report} />
          </>
        )}
      </QueryView>
    </Screen>
  );
}

const styles = StyleSheet.create({ head: { gap: spacing.xs } });
