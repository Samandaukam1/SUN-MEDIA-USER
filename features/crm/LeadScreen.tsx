import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, KeyValue, QueryView, Screen, Section, Text, useToast } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { confirmAction } from '@/lib/confirm';
import { formatShortDateTime } from '@/lib/time';
import { useNav } from '@/lib/routes';
import { deliverLeads, discardLeads, fetchLead, fieldLabel, platformLabel, restoreLead, type LeadDetail } from './api';

const STATUS: Record<LeadDetail['delivery_status'], { label: string; tone: 'warning' | 'success' | 'neutral' }> = {
  pending: { label: 'Mijozga yuborilmagan', tone: 'warning' },
  delivered: { label: 'Mijozga yuborilgan', tone: 'success' },
  discarded: { label: 'Chiqarib tashlangan', tone: 'neutral' },
};

/** Everything Meta sent about one lead, and the admin's decision: send to the client or set aside (spam / test). */
export function LeadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({ queryKey: ['crm', 'lead', id], queryFn: () => fetchLead(id), enabled: !!id });
  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen options={{ title: 'Lid' }} />
      <QueryView query={query}>{(lead) => <Body lead={lead} />}</QueryView>
    </Screen>
  );
}

function Body({ lead }: { lead: LeadDetail }) {
  const toast = useToast();
  const nav = useNav();
  const queryClient = useQueryClient();
  const done = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ['crm'] });
    toast.show(message, 'success');
  };
  const deliver = useMutation({ mutationFn: () => deliverLeads(lead.client_id, [lead.id]), onSuccess: () => done(`${lead.client.name}’ga yuborildi`), onError: toast.error });
  const discard = useMutation({
    mutationFn: () => discardLeads([lead.id], 'Admin chiqarib tashladi'),
    onSuccess: () => {
      done('Lid chiqarib tashlandi');
      nav.back();
    },
    onError: toast.error,
  });
  const restore = useMutation({ mutationFn: () => restoreLead(lead.id), onSuccess: () => done('Lid qaytarildi'), onError: toast.error });
  const status = STATUS[lead.delivery_status];
  const answers = Object.entries(lead.fields).filter(([, v]) => v != null && v !== '');
  const ready = lead.delivery_status === 'pending' && lead.fetch_status === 'complete';

  return (
    <>
      <Card style={styles.head}>
        <Text variant="title">{lead.full_name || 'Ism ko‘rsatilmagan'}</Text>
        <View style={styles.badges}>
          <Badge label={lead.client.name} tone="accent" />
          <Badge label={status.label} tone={status.tone} />
          {lead.fetch_status === 'failed' ? <Badge label="Ma’lumot olinmadi" tone="danger" icon="alert-triangle" /> : null}
        </View>
        {lead.phone ? (
          <Button title={lead.phone} icon="phone" variant="secondary" onPress={() => Linking.openURL(`tel:${lead.phone!.replace(/[^\d+]/g, '')}`).catch(() => undefined)} />
        ) : null}
      </Card>

      <Section title="Aloqa">
        <Card padded={false}>
          <KeyValue icon="user" label="Ism" value={lead.full_name} />
          <KeyValue icon="phone" label="Telefon" value={lead.phone} />
          <KeyValue icon="mail" label="Email" value={lead.email} />
          <KeyValue icon="clock" label="Qoldirilgan vaqt" value={formatShortDateTime(lead.lead_at)} />
        </Card>
      </Section>

      <Section title="Reklama">
        <Card padded={false}>
          <KeyValue icon="flag" label="Kampaniya" value={lead.campaign_name} />
          <KeyValue icon="layers" label="Auditoriya (ad set)" value={lead.adset_name} />
          <KeyValue icon="image" label="Reklama" value={lead.ad_name} />
          <KeyValue icon="file-text" label="Forma" value={lead.form_name} />
          <KeyValue icon="globe" label="Qayerdan" value={[platformLabel(lead.platform), lead.page_name].filter(Boolean).join(' · ') || null} />
        </Card>
      </Section>

      {answers.length > 0 ? (
        <Section title="Forma javoblari">
          <Card padded={false}>
            {answers.map(([key, value]) => (
              <KeyValue key={key} label={fieldLabel(key)} value={value} />
            ))}
          </Card>
        </Section>
      ) : null}

      {lead.fetch_error && lead.fetch_status !== 'complete' ? (
        <Text variant="caption" tone="danger">
          {lead.fetch_error}
        </Text>
      ) : null}
      {lead.delivered_at ? (
        <Text variant="caption" tone="tertiary">
          {`Yuborildi: ${formatShortDateTime(lead.delivered_at)}${lead.delivered_by_name ? ` · ${lead.delivered_by_name}` : ' · avtomatik'}`}
        </Text>
      ) : null}

      {lead.can_manage ? (
        <View style={styles.actions}>
          {ready ? <Button title={`${lead.client.name}’ga yuborish`} icon="send" loading={deliver.isPending} onPress={() => deliver.mutate()} /> : null}
          {lead.delivery_status === 'pending' ? (
            <Button
              title="Chiqarib tashlash (spam / test)"
              variant="ghost"
              loading={discard.isPending}
              onPress={async () => {
                if (await confirmAction('Lidni chiqarib tashlash', 'Mijoz bu lidni ko‘rmaydi. Keyin qaytarish mumkin.', 'Chiqarish', true)) discard.mutate();
              }}
            />
          ) : null}
          {lead.delivery_status === 'discarded' ? <Button title="Qaytarish" variant="secondary" loading={restore.isPending} onPress={() => restore.mutate()} /> : null}
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  head: { gap: spacing.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  actions: { gap: spacing.sm },
});
