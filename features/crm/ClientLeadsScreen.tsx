import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Chip, ChipRow, EmptyState, KeyValue, ListGroup, ListRow, QueryView, Screen, SkeletonCards, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/AuthProvider';
import { formatDateKey } from '@/lib/time';
import { useNav } from '@/lib/routes';
import { fetchClientLeads, fetchCrmReports, fieldLabel, LEADS_PAGE, type ClientLead, type ClientLeadPeriod } from './api';
import { LeadCard } from './components/LeadCard';

const PERIODS: { value: ClientLeadPeriod; label: string }[] = [
  { value: 'today', label: 'Bugun' },
  { value: '7d', label: '7 kun' },
  { value: '30d', label: '30 kun' },
  { value: 'all', label: 'Hammasi' },
];

/** Client → Lidlar: only the leads SUN MEDIA sent, newest first. Read-only; the phone number calls the person. */
export function ClientLeadsScreen() {
  const me = useMe();
  const nav = useNav();
  const clients = me.clients.filter((c) => c.permissions.includes('client.crm.view'));
  const [clientId, setClientId] = useState(clients[0]?.id ?? null);
  const [period, setPeriod] = useState<ClientLeadPeriod>('7d');
  const leads = useInfiniteQuery({
    queryKey: ['crm', 'client-leads', clientId, period],
    queryFn: ({ pageParam }) => fetchClientLeads(clientId!, period, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.leads.length === LEADS_PAGE ? last.leads[last.leads.length - 1].lead_at : undefined),
    enabled: !!clientId,
  });
  const reports = useQuery({ queryKey: ['crm', 'reports', clientId], queryFn: () => fetchCrmReports(clientId!), enabled: !!clientId });
  const counts = leads.data?.pages[0]?.counts;
  const rows = leads.data?.pages.flatMap((p) => p.leads) ?? [];

  if (!clientId) {
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: 'Lidlar' }} />
        <EmptyState icon="users" title="Lidlar bo‘limi yoqilmagan" description="SUN MEDIA reklama orqali lid yig‘ishni boshlaganda bu yerda ko‘rinadi." />
      </Screen>
    );
  }

  return (
    <Screen edges={[]} refreshing={leads.isRefetching} onRefresh={() => leads.refetch()}>
      <Stack.Screen options={{ title: 'Lidlar' }} />
      {clients.length > 1 ? (
        <ChipRow>
          {clients.map((c) => (
            <Chip key={c.id} label={c.name} selected={c.id === clientId} onPress={() => setClientId(c.id)} />
          ))}
        </ChipRow>
      ) : null}
      <ChipRow>
        {PERIODS.map((p) => (
          <Chip key={p.value} label={p.label} count={counts ? counts[p.value] : undefined} selected={period === p.value} onPress={() => setPeriod(p.value)} />
        ))}
      </ChipRow>

      {reports.data && reports.data.length > 0 ? (
        <ListGroup>
          <ListRow
            icon="bar-chart-2"
            iconTone="brand"
            title="Lidlar hisoboti"
            subtitle={`Oxirgisi: ${formatDateKey(reports.data[0].period_start)} – ${formatDateKey(reports.data[0].period_end, true)} · ${reports.data[0].total} ta lid`}
            onPress={() => nav.go(`/crm/report/${reports.data[0].id}`)}
          />
        </ListGroup>
      ) : null}

      <QueryView
        query={{ data: leads.data ? rows : undefined, error: leads.error, isPending: leads.isPending, refetch: leads.refetch }}
        skeleton={<SkeletonCards count={3} />}
        isEmpty={(d) => d.length === 0}
        empty={{
          icon: 'users',
          title: period === 'today' ? 'Bugun hali lid yo‘q' : 'Bu davrda lid yo‘q',
          description: 'SUN MEDIA reklamadan kelgan lidlarni tekshirib, shu yerga yuboradi. Yangi lid kelsa xabar olasiz.',
        }}
      >
        {(list) => (
          <View style={styles.list}>
            {list.map((lead) => (
              <ClientLeadItem key={lead.id} lead={lead} />
            ))}
            {leads.hasNextPage ? <Button title="Yana ko‘rsatish" variant="secondary" loading={leads.isFetchingNextPage} onPress={() => leads.fetchNextPage()} /> : null}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

function ClientLeadItem({ lead }: { lead: ClientLead }) {
  const [open, setOpen] = useState(false);
  const answers = Object.entries(lead.fields).filter(([, v]) => v != null && v !== '');
  return (
    <View style={styles.item}>
      <LeadCard
        name={lead.full_name}
        phone={lead.phone}
        email={lead.email}
        campaign={lead.campaign_name}
        ad={lead.ad_name}
        platform={lead.platform}
        leadAt={lead.lead_at}
        onOpen={answers.length > 0 || lead.email ? () => setOpen((v) => !v) : undefined}
      />
      {open ? (
        <Card padded={false}>
          {lead.email ? <KeyValue icon="mail" label="Email" value={lead.email} /> : null}
          {lead.form_name ? <KeyValue icon="file-text" label="Forma" value={lead.form_name} /> : null}
          {answers.map(([k, v]) => (
            <KeyValue key={k} label={fieldLabel(k)} value={v} />
          ))}
        </Card>
      ) : null}
      {open && answers.length === 0 && !lead.email ? (
        <Text variant="caption" tone="tertiary">
          Qo‘shimcha ma’lumot yo‘q.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  item: { gap: spacing.xs },
});
