import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Fab, ItemRow, QueryView, Screen, SelectField, Sheet, Text, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNav } from '@/lib/routes';
import { MonthSwitcher } from '@/features/performance/MonthSwitcher';
import { agencyDateKey, formatMonthYear, formatShortDateTime, monthStartKey } from '@/lib/time';
import { fetchReportClients, fetchReports, generateReport, type ReportRow } from './api';

/** Monthly reports: clients see what was published for them; managers also prepare new ones. */
export function ReportsScreen() {
  const { can, appInterface } = useAuth();
  const nav = useNav();
  const query = useQuery({ queryKey: ['reports', 'list'], queryFn: fetchReports });
  const [creating, setCreating] = useState(false);
  const isClient = appInterface === 'client';
  const manage = !isClient && can('reports.manage');

  const groups = useMemo(() => {
    const map = new Map<string, ReportRow[]>();
    (query.data ?? []).forEach((r) => map.set(r.period_month, [...(map.get(r.period_month) ?? []), r]));
    return [...map.entries()];
  }, [query.data]);

  return (
    <View style={styles.fill}>
      <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()} contentStyle={manage ? { paddingBottom: 140 } : undefined}>
        <Stack.Screen options={{ title: 'Oylik hisobotlar' }} />
        <QueryView
          query={query}
          isEmpty={(d) => d.length === 0}
          empty={{
            icon: 'bar-chart-2',
            title: isClient ? 'Hali hisobot yo‘q' : 'Hisobot yaratilmagan',
            description: isClient ? 'Oy yakunida menejeringiz hisobotni tayyorlaydi va sizga xabar keladi.' : manage ? 'Pastdagi tugma bilan oy uchun hisobot tayyorlang.' : undefined,
          }}
        >
          {() => (
            <>
              {groups.map(([month, rows]) => (
                <View key={month} style={styles.group}>
                  <Text variant="label" tone="tertiary">
                    {formatMonthYear(month)}
                  </Text>
                  <Card padded={false}>
                    {rows.map((r, i) => (
                      <ItemRow
                        key={r.id}
                        first={i === 0}
                        leading={<Avatar name={r.client?.code} url={r.client?.logo_url} size={36} />}
                        title={r.client?.name ?? 'Mijoz'}
                        subtitle={r.published_at ? `Nashr: ${formatShortDateTime(r.published_at)}` : r.generated_at ? `Hisoblandi: ${formatShortDateTime(r.generated_at)}` : 'Hali hisoblanmagan'}
                        right={isClient ? undefined : <Badge label={r.status === 'published' ? 'Nashr qilingan' : 'Qoralama'} tone={r.status === 'published' ? 'success' : 'warning'} />}
                        onPress={() => nav.report(r.id)}
                      />
                    ))}
                  </Card>
                </View>
              ))}
            </>
          )}
        </QueryView>
      </Screen>
      {manage ? <Fab label="Hisobot tayyorlash" icon="plus" onPress={() => setCreating(true)} overHomeIndicator /> : null}
      {manage ? <NewReportSheet visible={creating} onClose={() => setCreating(false)} /> : null}
    </View>
  );
}

function NewReportSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const nav = useNav();
  const toast = useToast();
  const queryClient = useQueryClient();
  const clients = useQuery({ queryKey: ['reports', 'clients'], queryFn: fetchReportClients, enabled: visible });
  const lastMonth = monthStartKey(agencyDateKey(new Date(Date.now() - 20 * 86_400_000)));
  const [clientId, setClientId] = useState<string | null>(null);
  const [month, setMonth] = useState(lastMonth);
  const create = useMutation({
    mutationFn: () => generateReport(clientId!, month),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      onClose();
      nav.report(report.id);
    },
    onError: toast.error,
  });
  return (
    <Sheet visible={visible} onClose={onClose} title="Oylik hisobot" actionLabel="Tayyorlash" actionDisabled={!clientId || create.isPending} onAction={() => create.mutate()}>
      <QueryView query={clients}>
        {(list) => (
          <SelectField
            label="Mijoz"
            options={list.map((c) => ({ value: c.id, label: c.name, description: c.code }))}
            value={clientId}
            onChange={setClientId}
            searchable
            icon="briefcase"
          />
        )}
      </QueryView>
      <MonthSwitcher month={month} onChange={setMonth} />
      <Text variant="caption" tone="tertiary">
        Raqamlar bazadagi haqiqiy ma’lumotdan yig‘iladi: tarif bajarilishi, syomkalar, tasdiqlar va kiritilgan statistika. Hisobot avval qoralama bo‘ladi.
      </Text>
      <Button title="Tayyorlash" icon="bar-chart-2" loading={create.isPending} disabled={!clientId} onPress={() => create.mutate()} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  group: { gap: spacing.sm },
});
