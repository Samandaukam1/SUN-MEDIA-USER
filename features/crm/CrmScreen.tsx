import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Chip, ChipRow, HeaderButton, ItemRow, QueryView, Screen, SegmentedControl, SkeletonCards, Text, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { confirmAction } from '@/lib/confirm';
import { formatShortDateTime } from '@/lib/time';
import { useNav } from '@/lib/routes';
import { deliverLeads, fetchCrmSummary, fetchLeads, LEADS_PAGE, type CrmSummary, type LeadRow, type LeadState } from './api';
import { LeadCard } from './components/LeadCard';

type Tab = Exclude<LeadState, 'discarded'>;

/**
 * CRM for the admin's phone: leads from Meta arrive here first. "Yangi" (last 24 hours), "Yuborilmagan" (all that
 * wait), "Yuborilgan". One tap sends a lead, or all ready leads of a client at once, to that client.
 * The Rahbar sees the same lists without any action.
 */
export function CrmScreen() {
  const nav = useNav();
  const [tab, setTab] = useState<Tab>('new');
  const [clientId, setClientId] = useState<string | null>(null);
  const summary = useQuery({ queryKey: ['crm', 'summary'], queryFn: fetchCrmSummary, refetchInterval: 60_000 });
  const leads = useInfiniteQuery({
    queryKey: ['crm', 'leads', tab, clientId],
    queryFn: ({ pageParam }) => fetchLeads(tab, clientId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length === LEADS_PAGE ? last[last.length - 1].lead_at : undefined),
  });
  const rows = leads.data?.pages.flat() ?? [];
  const canManage = summary.data?.can_manage ?? false;

  return (
    <Screen
      edges={[]}
      refreshing={summary.isRefetching || leads.isRefetching}
      onRefresh={() => {
        summary.refetch();
        leads.refetch();
      }}
    >
      <Stack.Screen
        options={{
          title: 'Lidlar',
          headerRight: canManage ? () => <HeaderButton icon="bar-chart-2" label="Hisobot" onPress={() => nav.go('/crm/report/new')} /> : undefined,
        }}
      />
      <QueryView query={summary} skeleton={<SkeletonCards count={2} />}>
        {(s) => (
          <>
            <SegmentedControl<Tab>
              options={[
                { value: 'new', label: 'Yangi', count: s.new },
                { value: 'pending', label: 'Yuborilmagan', count: s.pending },
                { value: 'delivered', label: 'Yuborilgan' },
              ]}
              value={tab}
              onChange={setTab}
            />
            {s.clients.length > 1 ? (
              <ChipRow>
                <Chip label="Hammasi" selected={clientId === null} onPress={() => setClientId(null)} />
                {s.clients.map((c) => (
                  <Chip key={c.id} label={c.name} count={tab === 'delivered' ? undefined : c.pending || undefined} selected={clientId === c.id} onPress={() => setClientId(c.id)} />
                ))}
              </ChipRow>
            ) : null}
            {canManage && tab !== 'delivered' ? <BulkDelivery summary={s} clientId={clientId} /> : null}
            {s.failed > 0 && tab !== 'delivered' ? (
              <Text variant="caption" tone="danger">
                {s.failed} ta lidning javoblari Meta’dan olinmadi. Integratsiyani tekshiring (web panel → Mijozlar → Integratsiyalar).
              </Text>
            ) : null}
          </>
        )}
      </QueryView>

      <QueryView
        query={{ data: leads.data ? rows : undefined, error: leads.error, isPending: leads.isPending, refetch: leads.refetch }}
        skeleton={<SkeletonCards count={3} />}
        isEmpty={(d) => d.length === 0}
        empty={{
          icon: 'inbox',
          title: tab === 'delivered' ? 'Hali lid yuborilmagan' : tab === 'new' ? 'Oxirgi 24 soatda yangi lid yo‘q' : 'Hamma lidlar yuborilgan',
          description:
            summary.data && summary.data.clients.length === 0
              ? 'Meta reklamalaridan lidlar mijoz sahifasi ulangandan keyin shu yerga keladi (web panel → Mijozlar → Integratsiyalar).'
              : undefined,
        }}
      >
        {(list) => (
          <View style={styles.list}>
            {list.map((lead) => (
              <LeadItem key={lead.id} lead={lead} canManage={canManage} />
            ))}
            {leads.hasNextPage ? (
              <Button title="Yana ko‘rsatish" variant="secondary" loading={leads.isFetchingNextPage} onPress={() => leads.fetchNextPage()} />
            ) : null}
          </View>
        )}
      </QueryView>
    </Screen>
  );
}

function LeadItem({ lead, canManage }: { lead: LeadRow; canManage: boolean }) {
  const nav = useNav();
  const toast = useToast();
  const queryClient = useQueryClient();
  const deliver = useMutation({
    mutationFn: () => deliverLeads(lead.client_id, [lead.id]),
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      toast.show(r.delivered ? `${lead.client_name}’ga yuborildi` : 'Bu lid allaqachon yuborilgan', 'success');
    },
    onError: toast.error,
  });
  const ready = lead.delivery_status === 'pending' && lead.fetch_status === 'complete';
  return (
    <LeadCard
      name={lead.full_name}
      phone={lead.phone}
      email={lead.email}
      client={lead.client_name}
      campaign={lead.campaign_name}
      ad={lead.ad_name}
      platform={lead.platform}
      leadAt={lead.lead_at}
      failed={lead.fetch_status === 'failed'}
      deliveredAt={lead.delivered_at}
      onOpen={() => nav.go(`/crm/lead/${lead.id}`)}
      onDeliver={canManage && ready ? () => deliver.mutate() : undefined}
      delivering={deliver.isPending}
    />
  );
}

/** "27 ta lidni SAFI’ga yuborish" — for the chosen client, or one row per client with ready leads. */
function BulkDelivery({ summary, clientId }: { summary: CrmSummary; clientId: string | null }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const deliver = useMutation({
    mutationFn: (client: { id: string; name: string; ready: number }) => deliverLeads(client.id),
    onSuccess: (r, client) => {
      queryClient.invalidateQueries({ queryKey: ['crm'] });
      toast.show(`${r.delivered} ta lid ${client.name}’ga yuborildi`, 'success');
    },
    onError: toast.error,
  });
  const run = async (client: { id: string; name: string; ready: number }) => {
    const ok = await confirmAction(
      `${client.ready} ta lidni ${client.name}’ga yuborish`,
      'Mijoz ularni darhol ko‘radi va xabar oladi.',
      'Yuborish',
    );
    if (ok) deliver.mutate(client);
  };
  const ready = summary.clients.filter((c) => c.ready > 0 && (clientId === null || c.id === clientId));
  if (ready.length === 0) return null;

  if (ready.length === 1) {
    const c = ready[0];
    return <Button title={`${c.ready} ta lidni ${c.name}’ga yuborish`} icon="send" loading={deliver.isPending} onPress={() => run(c)} />;
  }
  return (
    <Card padded={false}>
      {ready.map((c, i) => (
        <ItemRow
          key={c.id}
          first={i === 0}
          leading={<Avatar name={c.code} url={c.logo_url} size={34} />}
          title={`${c.name}: ${c.ready} ta tayyor`}
          subtitle={c.last_lead_at ? `Oxirgi lid: ${formatShortDateTime(c.last_lead_at)}` : null}
          right={<Button title="Yuborish" size="md" fullWidth={false} loading={deliver.isPending && deliver.variables?.id === c.id} onPress={() => run(c)} />}
        />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
});
